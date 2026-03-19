/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, Plus, Filter, CheckCircle2, X, UserPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay, parseISO, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrainingSession {
  id: string;
  moduleId: string;
  moduleTitle?: string;
  date: string;
  time: string;
  location: string;
  instructor: string;
  attendees: string[]; // Employee IDs
  status: 'scheduled' | 'concluded';
}

interface Employee {
  id: string;
  name: string;
  registration: string;
}

interface TrainingModule {
  id: string;
  title: string;
  periodMonths: number;
}

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<TrainingSession> | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sessions'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TrainingSession[];
      setSessions(sessionsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sessions'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeModules = onSnapshot(collection(db, 'modules'), (snapshot) => {
      setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TrainingModule[]);
    });
    const unsubscribeEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
    });
    return () => {
      unsubscribeModules();
      unsubscribeEmployees();
    };
  }, []);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const sessionsForSelectedDate = sessions.filter(s => isSameDay(parseISO(s.date), selectedDate));

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession?.moduleId || !editingSession?.date || !editingSession?.time) return;

    try {
      const sessionData = {
        ...editingSession,
        status: editingSession.status || 'scheduled',
        attendees: editingSession.attendees || [],
      };

      if (editingSession.id) {
        await updateDoc(doc(db, 'sessions', editingSession.id), sessionData);
      } else {
        await addDoc(collection(db, 'sessions'), sessionData);
      }
      setIsModalOpen(false);
      setEditingSession(null);
    } catch (error) {
      handleFirestoreError(error, editingSession.id ? OperationType.UPDATE : OperationType.CREATE, 'sessions');
    }
  };

  const handleConcludeSession = async (session: TrainingSession) => {
    if (!window.confirm('Deseja concluir este treinamento e atualizar o histórico dos colaboradores?')) return;

    try {
      const batch = writeBatch(db);
      const module = modules.find(m => m.id === session.moduleId);
      if (!module) return;

      const completionDate = session.date;
      const expiryDate = format(addMonths(parseISO(completionDate), module.periodMonths), 'yyyy-MM-dd');

      // Update session status
      batch.update(doc(db, 'sessions', session.id), { status: 'concluded' });

      // Update or create records for each attendee
      for (const employeeId of session.attendees) {
        const recordId = `${employeeId}_${session.moduleId}`;
        const recordRef = doc(db, 'records', recordId);
        
        batch.set(recordRef, {
          employeeId,
          moduleId: session.moduleId,
          status: 'completed',
          completionDate,
          expiryDate,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'sessions/records');
    }
  };

  const getModuleTitle = (moduleId: string) => {
    return modules.find(m => m.id === moduleId)?.title || 'Módulo Desconhecido';
  };

  return (
    <div className="space-y-6 md:space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-900 mb-2">Agenda</h2>
          <p className="text-stone-500 text-base md:text-lg">Planeje e acompanhe as próximas sessões de treinamento.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setEditingSession({ date: format(selectedDate, 'yyyy-MM-dd'), attendees: [] });
              setIsModalOpen(true);
            }}
            className="w-full md:w-auto bg-stone-900 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-stone-800 transition-all shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Nova Sessão
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        {/* Calendar Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-4 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <h3 className="text-xl md:text-3xl font-bold text-stone-900 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h3>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 md:p-3 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl md:rounded-2xl transition-all border border-stone-100">
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button onClick={nextMonth} className="p-2 md:p-3 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl md:rounded-2xl transition-all border border-stone-100">
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 md:mb-4">{day}</div>
              ))}
              {days.map((day, i) => {
                const hasSessions = sessions.some(s => isSameDay(parseISO(s.date), day));
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative group
                      ${!isSameMonth(day, currentMonth) ? 'opacity-20 pointer-events-none' : ''}
                      ${isSelected ? 'bg-stone-900 text-white shadow-xl scale-105 z-10' : 'hover:bg-stone-50 text-stone-900'}
                      ${isToday(day) && !isSelected ? 'border-2 border-stone-900' : ''}
                    `}
                  >
                    <span className="text-sm md:text-lg font-bold">{format(day, 'd')}</span>
                    {hasSessions && (
                      <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-stone-400 group-hover:bg-stone-900'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sessions List Column */}
        <div className="space-y-8">
          <div className="bg-stone-50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-stone-200 h-full">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-stone-900">
                {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "d 'de' MMM", { locale: ptBR })}
              </h3>
              <span className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">
                {sessionsForSelectedDate.length} Sessões
              </span>
            </div>

            <div className="space-y-6">
              {sessionsForSelectedDate.length > 0 ? (
                sessionsForSelectedDate.map(session => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={session.id}
                    className={`bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group ${session.status === 'concluded' ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${session.status === 'concluded' ? 'bg-emerald-500' : 'bg-stone-900'} text-white group-hover:scale-110 transition-transform`}>
                        {session.status === 'concluded' ? <CheckCircle2 className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Horário</p>
                        <p className="text-sm font-bold text-stone-900">{session.time}</p>
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-stone-900 mb-2">{getModuleTitle(session.moduleId)}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-stone-500 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-500 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{session.attendees.length} Inscritos</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-stone-50 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {session.attendees.slice(0, 3).map((empId, i) => {
                          const emp = employees.find(e => e.id === empId);
                          return (
                            <div key={empId} className="w-8 h-8 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-stone-400" title={emp?.name}>
                              {emp?.name.charAt(0) || '?'}
                            </div>
                          );
                        })}
                        {session.attendees.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-stone-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-stone-400">
                            +{session.attendees.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {session.status !== 'concluded' && (
                          <>
                            <button 
                              onClick={() => {
                                setEditingSession(session);
                                setIsModalOpen(true);
                              }}
                              className="text-xs font-bold text-stone-600 uppercase tracking-widest hover:text-stone-900"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleConcludeSession(session)}
                              className="text-xs font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700"
                            >
                              Concluir
                            </button>
                          </>
                        )}
                        {session.status === 'concluded' && (
                          <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Concluído</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 text-stone-300" />
                  </div>
                  <p className="text-stone-400 font-medium">Nenhuma sessão agendada para esta data.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Sessão */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-stone-900">
                    {editingSession?.id ? 'Editar Sessão' : 'Nova Sessão de Treinamento'}
                  </h3>
                  <p className="text-stone-500 text-xs md:text-sm">Preencha os detalhes da sessão e selecione os participantes.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-stone-200">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">Módulo de Treinamento</label>
                    <select
                      required
                      value={editingSession?.moduleId || ''}
                      onChange={e => setEditingSession({ ...editingSession, moduleId: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-900 focus:ring-2 focus:ring-stone-900 outline-none transition-all text-sm md:text-base"
                    >
                      <option value="">Selecione um módulo</option>
                      {modules.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">Data</label>
                    <input
                      type="date"
                      required
                      value={editingSession?.date || ''}
                      onChange={e => setEditingSession({ ...editingSession, date: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-900 focus:ring-2 focus:ring-stone-900 outline-none transition-all text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">Horário</label>
                    <input
                      type="time"
                      required
                      value={editingSession?.time || ''}
                      onChange={e => setEditingSession({ ...editingSession, time: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-900 focus:ring-2 focus:ring-stone-900 outline-none transition-all text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">Local</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sala A, Remoto..."
                      value={editingSession?.location || ''}
                      onChange={e => setEditingSession({ ...editingSession, location: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-900 focus:ring-2 focus:ring-stone-900 outline-none transition-all text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">Instrutor</label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do instrutor"
                      value={editingSession?.instructor || ''}
                      onChange={e => setEditingSession({ ...editingSession, instructor: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-900 focus:ring-2 focus:ring-stone-900 outline-none transition-all text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">Participantes</label>
                    <span className="text-[10px] md:text-xs font-bold text-stone-900">{editingSession?.attendees?.length || 0} Selecionados</span>
                  </div>
                  
                  <div className="bg-stone-50 rounded-[1.5rem] md:rounded-3xl border border-stone-200 p-3 md:p-4 max-h-40 md:max-h-48 overflow-y-auto space-y-2">
                    {employees.map(emp => {
                      const isSelected = editingSession?.attendees?.includes(emp.id);
                      return (
                        <div 
                          key={emp.id}
                          onClick={() => {
                            const current = editingSession?.attendees || [];
                            const next = isSelected 
                              ? current.filter(id => id !== emp.id)
                              : [...current, emp.id];
                            setEditingSession({ ...editingSession, attendees: next });
                          }}
                          className={`flex items-center justify-between p-2 md:p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-stone-900 text-white' : 'hover:bg-white'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${isSelected ? 'bg-stone-800' : 'bg-stone-200 text-stone-500'}`}>
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-bold">{emp.name}</p>
                              <p className={`text-[9px] md:text-[10px] ${isSelected ? 'text-stone-400' : 'text-stone-500'}`}>{emp.registration}</p>
                            </div>
                          </div>
                          {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 text-stone-300" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="order-2 md:order-1 flex-1 px-6 md:px-8 py-3 md:py-4 rounded-2xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm md:text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="order-1 md:order-2 flex-1 px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-lg text-sm md:text-base"
                  >
                    Salvar Sessão
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
