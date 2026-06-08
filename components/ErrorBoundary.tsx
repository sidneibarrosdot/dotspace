import React, { ErrorInfo, ReactNode } from 'react';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Desculpe, algo deu errado.";
      
      try {
        // Check if it's our JSON error
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Erro de permissão no Firestore (${parsedError.operationType}): ${parsedError.error}. Verifique se você está logado corretamente.`;
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-red-200 dark:border-red-900/30">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Ops! Ocorreu um erro</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-accent hover:bg-accent-dark text-white dark:text-zinc-900 font-bold py-2 px-4 rounded-full transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
