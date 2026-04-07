
import React, { useState } from 'react';
import DotLogo from '../components/DotLogo';
import { auth } from '../firebase';
import { 
  AuthError, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      fill="#EA4335"
      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.191 2.727 1.245 6.664L5.266 9.765z"
    />
    <path
      fill="#FBBC05"
      d="M1.245 6.664A11.942 11.942 0 0 0 0 12c0 1.92.445 3.736 1.245 5.336L5.266 14.235A7.094 7.094 0 0 1 4.909 12c0-.791.136-1.545.357-2.235L1.245 6.664z"
    />
    <path
      fill="#4285F4"
      d="M12 24c3.127 0 5.891-1.036 7.827-2.818l-4.127-3.4c-1.045.7-2.391 1.118-3.7 1.118-2.855 0-5.273-1.927-6.136-4.527l-4.021 3.101C3.191 21.273 7.273 24 12 24z"
    />
    <path
      fill="#34A853"
      d="M23.491 9.818H12V14.19h6.636c-.282 1.491-1.127 2.755-2.382 3.591l4.127 3.4C22.782 19.018 24 16.273 24 12c0-.764-.109-1.509-.509-2.182z"
    />
  </svg>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ALLOWED_DOMAIN = 'dotgroup.com.br';

  const isValidDomain = (email: string) => {
    const lowerEmail = email.toLowerCase();
    return lowerEmail.endsWith(`@${ALLOWED_DOMAIN}`);
  };

  const handleGoogleLogin = () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        const userEmail = result.user.email;
        if (userEmail && isValidDomain(userEmail)) {
          onLoginSuccess();
        } else {
          signOut(auth);
          setError(`Acesso restrito a e-mails @${ALLOWED_DOMAIN}`);
        }
      })
      .catch((err: AuthError) => {
        handleAuthError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleAuthError = (err: AuthError) => {
    console.error("Auth error:", err.code, err.message);
    switch (err.code) {
      case 'auth/popup-closed-by-user':
        setError('O login com Google foi cancelado.');
        break;
      default:
        setError('Ocorreu um erro. Tente novamente.');
        break;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-accent p-4">
      <div className="w-full max-w-[412px] bg-white rounded-xl shadow-2xl relative overflow-hidden">
        {/* Random Library/Archive Image Header */}
        <div className="w-full h-44 overflow-hidden relative">
          <img 
            src={`https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=800&sig=${Math.floor(Date.now() / 3600000)}`}
            alt="Library Archive"
            className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        <div className="p-8 pt-10 space-y-8">
          <div className="text-center">
              <DotLogo theme="light" className="h-12 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-zinc-900">
                Banco de PMV's
              </h2>
          </div>
          
          <div className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                <p className="text-sm text-red-500 text-center animate-fade-in">{error}</p>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-base font-semibold text-zinc-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <GoogleIcon className="h-6 w-6 transition-transform group-hover:scale-110" />
              <span>{loading ? 'Processando...' : 'Entrar com Google'}</span>
            </button>

            <p className="text-center text-gray-500 text-[11px] leading-relaxed">
              Faça login com seu e-mail DOT Digital Group para acessar o banco.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
