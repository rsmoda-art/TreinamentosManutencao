/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';

interface AuthProps {
  children: (user: User) => React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse flex flex-col items-center">
          <ShieldCheck className="w-12 h-12 text-stone-300 mb-4" />
          <div className="h-4 w-32 bg-stone-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-stone-200 text-center">
          <div className="w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Matriz de Treinamento</h1>
          <p className="text-stone-500 mb-10">Gestão de Conformidade e Habilidades de Funcionários</p>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
          
          <p className="mt-8 text-xs text-stone-400 uppercase tracking-widest">Edição Corporativa</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-stone-200 px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-white hover:text-stone-900 transition-all shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
      {children(user)}
    </>
  );
}
