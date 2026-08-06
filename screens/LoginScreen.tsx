
import React, { useState } from 'react';
import DotLogo from '../components/DotLogo';
import LoginBackdrop from '../components/LoginBackdrop';
import planetsDark from '../assets/planetas-dark.svg';

const STATIC_ACCESS_HASH = '2c2e93942f29295ad846bc75459bef1f8f3180b4ac26721642342412fb8230f3';

const hashPassword = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

interface LoginScreenProps {
  onLocalLogin: (email: string, displayName: string) => void;
  offlineMode: boolean;
  gcpLoginEnabled: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLocalLogin, offlineMode, gcpLoginEnabled }) => {
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccess = async () => {
    setError('');
    setLoading(true);
    try {
      if (window.location.hostname.endsWith('github.io')) {
        if (await hashPassword(password) !== STATIC_ACCESS_HASH) throw new Error('Senha inválida.');
        onLocalLogin('acesso@example.com', 'Usuário DOT');
        return;
      }
      const response = await fetch('/api/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) throw new Error('Senha inválida.');
      onLocalLogin('acesso@example.com', 'Usuário DOT');
    } catch (accessError) {
      setError(accessError instanceof Error ? accessError.message : 'Não foi possível validar o acesso.');
    } finally { setLoading(false); }
  };

  return (
    <LoginBackdrop>
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <style>{`
          @keyframes bg-planet-breath {
            0% { transform: translateX(-50%) translateY(50%) scale(1); opacity: 0.42; }
            50% { transform: translateX(-50%) translateY(47%) scale(1.03); opacity: 0.56; }
            100% { transform: translateX(-50%) translateY(50%) scale(1); opacity: 0.42; }
          }
          @keyframes bg-planet-breath-soft {
            0% { transform: translateX(-50%) translateY(52%) scale(0.97) rotate(0deg); opacity: 0.22; }
            50% { transform: translateX(-50%) translateY(49%) scale(1) rotate(3deg); opacity: 0.32; }
            100% { transform: translateX(-50%) translateY(52%) scale(0.97) rotate(0deg); opacity: 0.22; }
          }
        `}</style>

        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src={planetsDark}
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 bottom-0 h-[82vh] w-[82vh] -translate-x-1/2 translate-y-1/2 blur-[42px] saturate-150 opacity-70"
            style={{ animation: 'bg-planet-breath 16s ease-in-out infinite' }}
            draggable={false}
          />
          <img
            src={planetsDark}
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 bottom-[-6vh] h-[58vh] w-[58vh] -translate-x-1/2 translate-y-1/2 blur-[24px] saturate-125 opacity-40"
            style={{ animation: 'bg-planet-breath-soft 22s ease-in-out infinite' }}
            draggable={false}
          />
        </div>

        <div className="animate-ui-rise relative z-20 w-full max-w-[440px]">
          <div className="mb-8 flex justify-center md:mb-10">
            <DotLogo
              theme="dark"
              variant="login"
              className="drop-shadow-[0_14px_35px_rgba(0,0,0,0.45)] [--brand-planet:clamp(86px,14vw,112px)]"
            />
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/14 bg-black/38 px-5 py-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.56)] backdrop-blur-[34px] md:px-6 md:py-7">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.025)_28%,rgba(0,0,0,0.08)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_72%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/8" />

            <div className="relative flex flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#b6f23f]">
                Acesso interno
              </p>
              <p className="mt-3 w-full text-sm leading-6 text-white/74">
                Um espaço que conecta processos, treinamentos e conhecimento para manter o time em órbita.
              </p>

              <div className="mt-6 w-full space-y-3">
                <input type="password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => event.key === 'Enter' && handleAccess()} placeholder="Senha de acesso" autoComplete="current-password" className="w-full rounded-2xl border border-white/14 bg-black/24 px-4 py-4 text-white outline-none placeholder:text-white/40 focus:border-[#88C125]" />
                <button
                  type="button"
                  onClick={handleAccess}
                  disabled={loading || !password}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/14 bg-black/24 px-4 py-4 text-base font-bold text-white shadow-[0_18px_32px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/8"
                >
                  {loading ? 'Validando...' : 'Acessar plataforma'}
                </button>

                <button
                  type="button"
                  disabled={!gcpLoginEnabled}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white/70 shadow-[0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                  title="Login corporativo disponível após integração"
                  >
                  <img
                    src="https://www.svgrepo.com/show/303108/google-icon-logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  Entrar com Google
                </button>
              </div>

              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.26em] text-white/42">
                Ambiente de teste
              </p>

              {error && (
                <p className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-50">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </LoginBackdrop>
  );
};

export default LoginScreen;
