# CLAUDE.md — whatdyoudo.com

Leia este arquivo inteiro antes de escrever qualquer código.
Leia também `UBIQUITOUS_LANGUAGE.md` — os termos definidos lá são usados no código, banco e testes sem exceção.

---

## Stack

- **Framework:** Next.js 14+ com App Router
- **Linguagem:** TypeScript (strict mode — sem `any`)
- **Banco:** Supabase (Postgres + Auth + RLS)
- **Estilo:** Tailwind CSS
- **Testes:** Vitest + Testing Library
- **Notificações:** PWA Web Push (VAPID)

---

## Estrutura de pastas

```
src/
  app/                  # Rotas Next.js (App Router)
  modules/              # Módulos de domínio (ver seção abaixo)
  components/           # Componentes de UI reutilizáveis
  lib/                  # Clientes externos (supabase, ai)
  types/                # Tipos TypeScript globais
```

---

## Módulos de domínio

Cada módulo vive em `src/modules/<nome>/` e segue a estrutura:

```
src/modules/streak/
  index.ts        # Interface pública — o único arquivo que outros módulos importam
  service.ts      # Lógica de negócio
  repository.ts   # Acesso ao banco (somente aqui)
  types.ts        # Tipos internos do módulo
  service.test.ts # Testes unitários
```

### Regra dos módulos profundos
- **Interface pública mínima** — `index.ts` exporta apenas o que outros módulos precisam
- **Nunca importar `repository.ts` ou `service.ts` diretamente de fora do módulo**
- **Nunca acessar o banco fora de um `repository.ts`**
- Se um módulo precisa de dado de outro módulo, chama a interface pública — nunca acessa a tabela diretamente

### Módulos existentes

| Módulo | Responsabilidade | Interface pública |
|--------|-----------------|-------------------|
| `streak` | Calcular e atualizar Streak, detectar StreakAlert e StreakReset | `getStreak(projectId)`, `processVerdict(projectId, verdict)` |
| `verdict` | Chamar a IA, parsear resposta, retornar Verdict | `evaluate(dailyLog, project)` |
| `daily-log` | Criar, buscar e validar DailyLogs | `createLog(input)`, `getLog(projectId, date)`, `canEdit(logId)` |
| `project` | CRUD de Project e ValidationCriteria | `getProject(userId)`, `updateProject(input)` |
| `notifications` | Gerenciar PushSubscriptions e disparar notificações | `subscribe(userId, subscription)`, `scheduleReminder(projectId)` |
| `auth` | Helpers de autenticação e perfil do usuário | `getUser()`, `getUserTimezone()` |

---

## Regras de negócio críticas

### Timezone
- A data local do usuário **sempre** é calculada usando `users.timezone`
- Nunca usar `new Date()` diretamente para determinar `log_date` — usar sempre `toLocaleDateString` com o timezone do usuário
- `log_date` é um `date` (sem hora) no banco — representa o dia local do usuário

### Verdict
- Três valores possíveis: `green`, `yellow`, `red`
- `green` e `yellow` mantêm o Streak
- `red` incrementa `consecutive_red_count`
- Dia de compromisso sem DailyLog = `missed`, tratado como `red`

### Streak
- `consecutive_red_count === 1` → disparar `StreakAlert` (não zera ainda)
- `consecutive_red_count === 2` → disparar `StreakResetNotification` + zerar `current_streak`
- `green` ou `yellow` → zerar `consecutive_red_count`, incrementar `current_streak`
- Streak é por Project, não por User

### Edição de DailyLog
- Permitida somente se `submitted_at` for do mesmo dia (calculado no timezone do usuário)
- Após meia-noite do dia local do usuário, o log está bloqueado para edição

### Limite de projetos (beta)
- Um usuário no plano `free` pode ter no máximo **1 projeto ativo**
- O banco garante via unique index parcial — mas o código também deve verificar antes de criar
- Nunca remover essa verificação sem alterar o schema primeiro

### CommitmentSchedule
- Array de inteiros: `0` = domingo, `1` = segunda, ..., `6` = sábado
- DailyReminder só é enviado em dias presentes no `commitment_days` do projeto
- `missed` só é registrado em dias presentes no `commitment_days`

---
## IA (Verdict)

- Modelo: gemini-2.0-flash via Google Generative AI (gratuito para uso inicial)
- Migração futura para claude-sonnet-4-6 é uma mudança isolada em service.ts — o módulo foi desenhado para isso
- O prompt sempre inclui: ProjectDescription, ValidationCriteria ativos, conteúdo do DailyLog
- Resposta esperada: JSON { "verdict": "green"|"yellow"|"red", "reason": "string (máx 2 frases)" }
- Sempre validar o JSON antes de salvar — se a resposta não for válida, retornar erro, nunca salvar lixo
- O system prompt fica em src/modules/verdict/prompt.ts — nunca inline
---

## Notificações PWA

- Chaves VAPID ficam em variáveis de ambiente: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- O cron de DailyReminder roda via Supabase Edge Functions ou Next.js API Route com cron
- Antes de enviar qualquer notificação, verificar se `push_subscriptions.is_active === true`
- Se o envio falhar com erro 410 (Gone), marcar `is_active = false` — o dispositivo desinstalou o app

---

## Convenções de código

- **Nomes:** usar exatamente os termos do `UBIQUITOUS_LANGUAGE.md` — `dailyLog`, não `entry`; `verdict`, não `status`; `project`, não `habit`
- **Erros:** nunca silenciar erros com `catch (e) {}` vazio — sempre logar ou relançar
- **Tipos:** tipos de banco ficam em `src/types/database.ts` gerados pelo Supabase CLI (`supabase gen types`)
- **Server vs Client:** lógica de negócio e acesso ao banco sempre em Server Components ou Route Handlers — nunca chamar Supabase diretamente de Client Components
- **Variáveis de ambiente:** nunca hardcodar chaves — todas em `.env.local` com prefixo `NEXT_PUBLIC_` só quando necessário no cliente

---

## O que nunca fazer

- ❌ Não usar `any` em TypeScript
- ❌ Não acessar o banco fora de um `repository.ts`
- ❌ Não importar internals de um módulo de fora dele (`service.ts`, `repository.ts`)
- ❌ Não calcular datas sem considerar o timezone do usuário
- ❌ Não salvar Verdict sem validar o JSON da IA primeiro
- ❌ Não criar um segundo projeto ativo sem verificar o limite do plano
- ❌ Não escrever lógica de streak fora do módulo `streak`
- ❌ Não hardcodar o system prompt da IA inline — sempre em `prompt.ts`

---

## Ordem de desenvolvimento recomendada

1. Setup do projeto (Next.js + Supabase + Tailwind + Vitest)
2. Módulo `auth` — login, sessão, perfil
3. Módulo `project` — criar e editar projeto
4. Módulo `daily-log` — submeter relato
5. Módulo `verdict` — integração com IA
6. Módulo `streak` — cálculo e regras
7. Módulo `notifications` — PWA push
8. UI completa mobile-first
