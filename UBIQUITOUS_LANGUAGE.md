# Ubiquitous Language — whatdyoudo.com

Termos usados consistentemente no código, banco de dados, testes e conversas.

---

## Entidades core

| Termo | Definição |
|-------|-----------|
| **User** | Pessoa autenticada no sistema via Supabase Auth. |
| **Project** | Unidade de trabalho que o usuário está comprometido a avançar. Tem nome, descrição livre e critérios opcionais de validação. No beta, cada usuário tem exatamente um Project. O schema suporta múltiplos. |
| **ProjectDescription** | Texto livre que descreve o que é o projeto — contexto para a IA entender o domínio. Ex: "Orbi é um SaaS de portfólio para investidores brasileiros, estou na fase de validação." |
| **ValidationCriteria** | Lista opcional de critérios explícitos que definem o que é um bom dia naquele projeto. Ex: "avancei no produto", "falei com um usuário". Se ausente, a IA usa apenas a ProjectDescription. |
| **CommitmentSchedule** | Dias da semana nos quais o usuário se comprometeu a trabalhar no projeto. Ex: segunda a sexta. Apenas esses dias entram no cálculo de Streak e validade. |
| **DailyLog** | Relato em texto livre submetido pelo usuário descrevendo o que fez naquele projeto em um determinado dia. Um DailyLog pertence a um Project e a uma data. |
| **Verdict** | Resultado da avaliação da IA sobre um DailyLog. Três estados possíveis: `green`, `yellow`, `red`. |
| **VerdictReason** | Texto gerado pela IA explicando o Verdict. Curto, direto, máx 2 frases. |

---

## Vereditos

| Termo | Valor no código | Definição |
|-------|----------------|-----------|
| **Green** | `green` | Dia sólido. O usuário cumpriu o essencial dos critérios. Mantém o streak. |
| **Yellow** | `yellow` | Dia parcial. O usuário fez algo relevante mas ficou abaixo do esperado. Mantém o streak, gera alerta suave. |
| **Red** | `red` | Dia perdido. O usuário não avançou nada relevante. Não zera o streak imediatamente — veja regra de Streak. |
| **Missed** | `missed` | Dia de compromisso sem DailyLog submetido. Tratado como `red` para fins de cálculo de Streak. |

---

## Streak

| Termo | Definição |
|-------|-----------|
| **Streak** | Contador de dias consecutivos sem dois Reds seguidos num Project. Associado ao Project, não ao User. |
| **StreakAlert** | Notificação disparada quando o usuário recebe um primeiro `red` ou `missed`. Mensagem: "atenção, ontem foi vermelho — hoje é importante." |
| **StreakReset** | Evento que zera o Streak. Ocorre quando dois dias consecutivos de compromisso resultam em `red` ou `missed`. Dispara notificação de reset. |

---

## Notificações

| Termo | Definição |
|-------|-----------|
| **DailyReminder** | Notificação push PWA enviada no horário fixo definido pelo usuário, nos dias do CommitmentSchedule, se o DailyLog ainda não foi submetido naquele dia. |
| **ReminderTime** | Horário fixo (HH:MM) definido pelo usuário para receber o DailyReminder. |
| **StreakAlert** | Notificação push disparada após um dia `red` ou `missed`, avisando que o próximo dia é crítico para não zerar o Streak. |
| **StreakResetNotification** | Notificação push disparada quando o Streak é zerado por dois Reds consecutivos. |

---

## Plano e monetização

| Termo | Definição |
|-------|-----------|
| **Plan** | Campo no User que define os limites de uso. Valor padrão: `free`. Preparado para monetização futura mas sem paywall ativo no beta. |
| **Freeplan** | Plano padrão. No beta: permite um Project. No futuro: limite a ser definido. |

---

## Regras de negócio em linguagem ubíqua

1. Um **User** no beta tem exatamente um **Project** ativo na UI, mas o schema permite múltiplos.
2. Um **DailyLog** só pode ser submetido em dias que fazem parte do **CommitmentSchedule** do **Project**.
3. Um dia de compromisso sem **DailyLog** é automaticamente tratado como **Missed** (`red`).
4. O **Verdict** é gerado pela IA com base no **DailyLog**, **ProjectDescription** e **ValidationCriteria**.
5. **Green** e **Yellow** mantêm o **Streak**. **Red** e **Missed** não zeram imediatamente.
6. Dois **Red** ou **Missed** consecutivos disparam um **StreakReset**.
7. O primeiro **Red** ou **Missed** dispara um **StreakAlert**.
8. O **DailyReminder** só é enviado se o **DailyLog** ainda não foi submetido naquele dia.
