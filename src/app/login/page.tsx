import { login, signup } from "./actions";

type LoginPageProps = {
  searchParams: { error?: string; message?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">whatdyoudo</h1>

        {searchParams.error && <p className="text-sm text-red-600">{searchParams.error}</p>}
        {searchParams.message && (
          <p className="text-sm text-green-600">{searchParams.message}</p>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            formAction={login}
            className="flex-1 rounded bg-black px-3 py-2 text-white"
          >
            Entrar
          </button>
          <button formAction={signup} className="flex-1 rounded border px-3 py-2">
            Criar conta
          </button>
        </div>
      </form>
    </main>
  );
}
