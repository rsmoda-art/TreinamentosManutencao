/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// @ts-ignore
export default class ErrorBoundary extends React.Component<Props, State> {
  // @ts-ignore
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    // @ts-ignore
    const { hasError, error } = this.state;
    // @ts-ignore
    const { children } = this.props;
    
    if (hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      try {
        const errorData = JSON.parse(error?.message || '{}');
        if (errorData.error) {
          errorMessage = `Erro no Firestore: ${errorData.error} durante ${errorData.operationType} em ${errorData.path}`;
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-stone-200">
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">Erro na Aplicação</h2>
            <p className="text-stone-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-stone-900 text-white py-2 rounded-xl hover:bg-stone-800 transition-colors"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
