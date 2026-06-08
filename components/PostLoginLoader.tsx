import React, { useMemo } from 'react';
import planetsDark from '../assets/planetas-dark.svg';

interface PostLoginLoaderProps {
  theme: 'light' | 'dark';
  exiting?: boolean;
}

const PostLoginLoader: React.FC<PostLoginLoaderProps> = ({ exiting = false }) => {
  const planetsSrc = planetsDark;
  const loadingMessages = useMemo(
    () => [
      'Carregando um espaço repleto de boas ideias.',
      'Organizando processos em órbita.',
      "Conectando treinamentos, OKR's e boas práticas.",
      'Preparando links seguros para o time.',
      'Atualizando o hub para todos navegarem melhor.',
      'Alinhando conhecimento para decolar.',
    ],
    []
  );
  const loadingMessage = useMemo(
    () => loadingMessages[Math.floor(Math.random() * loadingMessages.length)],
    [loadingMessages]
  );

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070b14] transition-opacity duration-700 ease-out ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <style>{`
        @keyframes loader-planet-breathe {
          0% { transform: translateY(0) scale(0.985); opacity: 0.9; }
          50% { transform: translateY(-4px) scale(1.015); opacity: 1; }
          100% { transform: translateY(0) scale(0.985); opacity: 0.9; }
        }
        @keyframes loader-message-pulse {
          0%, 100% { opacity: 0.62; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
        }
        @keyframes loader-line-fill {
          0% { transform: scaleX(0); opacity: 0.35; }
          15% { opacity: 1; }
          100% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(153,204,0,0.14),transparent_40%),radial-gradient(circle_at_50%_78%,rgba(46,61,93,0.3),transparent_52%)]" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-7 px-6 pb-32 text-center">
        <img
          src={planetsSrc}
          alt=""
          aria-hidden="true"
          className="h-[140px] w-[140px] select-none object-contain drop-shadow-[0_18px_42px_rgba(0,0,0,0.38)] sm:h-[170px] sm:w-[170px]"
          style={{ animation: 'loader-planet-breathe 2.8s ease-in-out infinite' }}
          draggable={false}
        />
        <div className="flex w-full max-w-[420px] flex-col items-center gap-5">
          <p
            className="max-w-[360px] text-sm font-normal leading-relaxed tracking-[0.03em] text-white/74 sm:text-base"
            style={{ animation: 'loader-message-pulse 2.6s ease-in-out infinite' }}
          >
            {loadingMessage}
          </p>
        </div>
      </div>
      <div className="pointer-events-none absolute left-0 right-0 top-[63%] h-px overflow-hidden bg-white/14">
        <span
          className="absolute left-0 top-0 h-px w-full origin-left rounded-full bg-white/90"
          style={{ animation: 'loader-line-fill 1.35s ease-out forwards' }}
        />
      </div>
    </div>
  );
};

export default PostLoginLoader;
