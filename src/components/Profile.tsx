/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, ShieldCheck, Award, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-5xl font-bold tracking-tight text-stone-900 mb-2">Meu Perfil</h2>
          <p className="text-stone-500 text-lg">Gerencie suas informações pessoais e registros de treinamento.</p>
        </div>
        <button className="bg-stone-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold hover:bg-stone-800 transition-all shadow-md transform hover:scale-[1.02] active:scale-[0.98]">
          Editar Perfil
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-stone-200 shadow-sm text-center">
            <div className="w-32 h-32 bg-stone-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-lg overflow-hidden">
              <User className="w-16 h-16 text-stone-300" />
            </div>
            <h3 className="text-3xl font-bold text-stone-900 mb-2">Administrador</h3>
            <p className="text-stone-500 font-medium mb-8">Gerente do Sistema</p>
            
            <div className="space-y-4 text-left border-t border-stone-50 pt-8">
              <div className="flex items-center gap-4 text-stone-600">
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">E-mail</p>
                  <p className="text-sm font-bold text-stone-900">admin@matrixpro.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-stone-600">
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Cargo</p>
                  <p className="text-sm font-bold text-stone-900">Super Administrador</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-stone-600">
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Entrou em</p>
                  <p className="text-sm font-bold text-stone-900">Janeiro de 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats and Activity */}
        <div className="lg:col-span-2 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
              <Award className="w-8 h-8 text-emerald-600 mb-4" />
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Certificações</p>
              <h4 className="text-3xl font-bold text-emerald-900">12</h4>
            </div>
            <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100">
              <Clock className="w-8 h-8 text-amber-600 mb-4" />
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Em Andamento</p>
              <h4 className="text-3xl font-bold text-amber-900">3</h4>
            </div>
            <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100">
              <AlertCircle className="w-8 h-8 text-rose-600 mb-4" />
              <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Expirando em Breve</p>
              <h4 className="text-3xl font-bold text-rose-900">1</h4>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-stone-200 shadow-sm">
            <h3 className="text-2xl font-bold text-stone-900 mb-8">Certificações Recentes</h3>
            <div className="space-y-6">
              {[
                { title: 'Protocolo de Segurança do Sistema', date: '15 de Mar, 2024', status: 'Ativo' },
                { title: 'Conformidade de Privacidade de Dados', date: '28 de Fev, 2024', status: 'Ativo' },
                { title: 'Treinamento de Administração Avançada', date: '10 de Jan, 2024', status: 'Ativo' },
              ].map((cert, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-stone-50 border border-stone-100 hover:bg-stone-900 hover:text-white transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-stone-900 group-hover:scale-110 transition-transform">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg">{cert.title}</h5>
                      <p className="text-sm text-stone-400 group-hover:text-stone-300">Emitido em {cert.date}</p>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest shadow-sm">
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
