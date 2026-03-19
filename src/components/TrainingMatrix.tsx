/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CheckCircle2, Clock, AlertCircle, Plus, Search, Filter, ChevronRight, Settings2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, isAfter } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface Module {
  id: string;
  title: string;
  category: string;
  frequency: 'one-time' | 'annual' | 'biennial';
}

interface Record {
  id: string;
  employeeId: string;
  moduleId: string;
  completionDate?: string;
  expiryDate?: string;
  status: 'completed' | 'pending' | 'expired';
  isMandatory?: boolean;
}

export default function TrainingMatrix() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ empId: string; modId: string } | null>(null);

  const [moduleForm, setModuleForm] = useState({
    title: '',
    category: 'Safety',
    frequency: 'annual' as const,
  });

  const [recordForm, setRecordForm] = useState({
    completionDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'completed' as const,
    isMandatory: false,
  });

  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
    });
    const unsubModules = onSnapshot(collection(db, 'modules'), (snapshot) => {
      setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Module[]);
    });
    const unsubRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Record[]);
    });

    return () => {
      unsubEmployees();
      unsubModules();
      unsubRecords();
    };
  }, []);

  const handleToggleMandatory = async (empId: string, modId: string, currentIsMandatory: boolean) => {
    const recordId = `${empId}_${modId}`;
    const recordRef = doc(db, 'records', recordId);
    try {
      await setDoc(recordRef, {
        employeeId: empId,
        moduleId: modId,
        isMandatory: !currentIsMandatory,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'records');
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'modules'), moduleForm);
      setIsModuleModalOpen(false);
      setModuleForm({
        title: '',
        category: 'Safety',
        frequency: 'annual',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'modules');
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    const module = modules.find(m => m.id === selectedCell.modId);
    if (!module) return;

    let expiryDate = '';
    if (module.frequency === 'annual') {
      expiryDate = format(addMonths(new Date(recordForm.completionDate), 12), 'yyyy-MM-dd');
    } else if (module.frequency === 'biennial') {
      expiryDate = format(addMonths(new Date(recordForm.completionDate), 24), 'yyyy-MM-dd');
    }

    const recordId = `${selectedCell.empId}_${selectedCell.modId}`;
    const recordRef = doc(db, 'records', recordId);

    try {
      await setDoc(recordRef, {
        employeeId: selectedCell.empId,
        moduleId: selectedCell.modId,
        ...recordForm,
        expiryDate,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      setIsRecordModalOpen(false);
      setSelectedCell(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'records');
    }
  };

  const getRecord = (empId: string, modId: string) => {
    return records.find(r => r.employeeId === empId && r.moduleId === modId);
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-900 mb-2">Matriz de Treinamento</h2>
          <p className="text-stone-500 text-base md:text-lg">Cruzamento de funcionários com módulos de treinamento obrigatórios.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsModuleModalOpen(true)}
            className="bg-white border border-stone-200 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all shadow-sm w-full md:w-auto"
          >
            <Settings2 className="w-4 h-4" />
            Gerenciar Módulos
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-stone-100 bg-stone-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sticky left-0">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar funcionários..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Conforme</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Expirado</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="px-8 py-6 text-xs font-bold text-stone-400 uppercase tracking-widest bg-white sticky left-0 z-10 w-64 min-w-[16rem]">Employee</th>
                {modules.map(mod => (
                  <th key={mod.id} className="px-6 py-6 text-xs font-bold text-stone-900 uppercase tracking-widest border-l border-stone-50 min-w-[12rem]">
                    <div className="flex flex-col gap-1">
                      <span className="text-stone-400 font-medium">{mod.category}</span>
                      <span className="truncate max-w-[10rem]">{mod.title}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-8 py-6 bg-white sticky left-0 z-10 group-hover:bg-stone-50 transition-colors border-r border-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center font-bold text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{emp.name}</p>
                        <p className="text-xs text-stone-400">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  {modules.map(mod => {
                    const record = getRecord(emp.id, mod.id);
                    const isMandatory = record?.isMandatory || false;
                    return (
                      <td 
                        key={mod.id} 
                        className="px-6 py-6 border-l border-stone-50 text-center group/cell transition-colors relative"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <button
                            onClick={() => handleToggleMandatory(emp.id, mod.id, isMandatory)}
                            className={`p-1.5 rounded-lg transition-all ${
                              isMandatory ? 'text-amber-500 bg-amber-50' : 'text-stone-200 hover:text-stone-400'
                            }`}
                            title={isMandatory ? "Obrigatório" : "Tornar Obrigatório"}
                          >
                            <Settings2 className={`w-4 h-4 ${isMandatory ? 'fill-current' : ''}`} />
                          </button>

                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedCell({ empId: emp.id, modId: mod.id });
                              if (record) {
                                setRecordForm({
                                  completionDate: record.completionDate || format(new Date(), 'yyyy-MM-dd'),
                                  status: record.status,
                                  isMandatory: record.isMandatory || false,
                                });
                              } else {
                                setRecordForm({
                                  completionDate: format(new Date(), 'yyyy-MM-dd'),
                                  status: 'pending',
                                  isMandatory: false,
                                });
                              }
                              setIsRecordModalOpen(true);
                            }}
                          >
                            {record && record.completionDate ? (
                              <div className={`p-2 rounded-xl transition-all transform group-hover/cell:scale-110 ${
                                record.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                record.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                              }`}>
                                {record.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                                 record.status === 'pending' ? <Clock className="w-6 h-6" /> :
                                 <AlertCircle className="w-6 h-6" />}
                              </div>
                            ) : (
                              <div className={`p-2 rounded-xl transition-all ${isMandatory ? 'bg-amber-50 text-amber-500' : 'bg-stone-50 text-stone-200 opacity-0 group-hover/cell:opacity-100'}`}>
                                <Plus className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Modal */}
      <AnimatePresence>
        {isModuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModuleModalOpen(false)} className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-stone-200 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 className="text-xl md:text-2xl font-bold text-stone-900">Novo Módulo</h3>
                <button onClick={() => setIsModuleModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleCreateModule} className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Título do Módulo</label>
                  <input required type="text" value={moduleForm.title} onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})} className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all" placeholder="ex: Segurança Contra Incêndio Nível 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Categoria</label>
                    <select value={moduleForm.category} onChange={(e) => setModuleForm({...moduleForm, category: e.target.value})} className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all appearance-none">
                      <option value="Safety">Segurança</option>
                      <option value="Technical">Técnico</option>
                      <option value="Compliance">Conformidade</option>
                      <option value="Soft Skills">Habilidades Interpessoais</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Frequência</label>
                    <select value={moduleForm.frequency} onChange={(e) => setModuleForm({...moduleForm, frequency: e.target.value as any})} className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all appearance-none">
                      <option value="one-time">Uma vez</option>
                      <option value="annual">Anual</option>
                      <option value="biennial">Bienal</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-lg">Criar Módulo</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Modal */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRecordModalOpen(false)} className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-stone-200 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 className="text-xl md:text-2xl font-bold text-stone-900">Atualizar Registro</h3>
                <button onClick={() => setIsRecordModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleUpdateRecord} className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Data de Conclusão</label>
                  <input required type="date" value={recordForm.completionDate} onChange={(e) => setRecordForm({...recordForm, completionDate: e.target.value})} className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'completed', label: 'Concluído' },
                      { id: 'pending', label: 'Pendente' },
                      { id: 'expired', label: 'Expirado' }
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRecordForm({...recordForm, status: id as any})}
                        className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${
                          recordForm.status === id 
                            ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                            : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-lg">Salvar Registro</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
