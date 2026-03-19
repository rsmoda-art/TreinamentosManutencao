/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, MoreVertical, Edit2, Trash2, UserPlus, Filter, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, addMonths } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  hireDate: string;
  status: 'active' | 'inactive';
  email: string;
  functionalRestriction?: string;
}

interface Module {
  id: string;
  title: string;
  frequency: string;
}

interface Record {
  id: string;
  employeeId: string;
  moduleId: string;
  status: 'completed' | 'pending' | 'expired';
  expiryDate?: string;
  isMandatory?: boolean;
}

interface EmployeeManagementProps {
  onBulkEdit: () => void;
}

export default function EmployeeManagement({ onBulkEdit }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'active' as const,
    email: '',
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

  // Helper to get employee training status
  const getEmployeeTrainingAlerts = (empId: string) => {
    const empRecords = records.filter(r => r.employeeId === empId);
    const alerts = empRecords.map(r => {
      const module = modules.find(m => m.id === r.moduleId);
      if (!module) return null;

      const isExpired = r.status === 'expired' || (r.expiryDate && isAfter(new Date(), new Date(r.expiryDate)));
      const isExpiringSoon = r.expiryDate && !isExpired && isAfter(addMonths(new Date(), 1), new Date(r.expiryDate));

      if (isExpired || isExpiringSoon) {
        return {
          title: module.title,
          expiryDate: r.expiryDate,
          status: isExpired ? 'expired' : 'expiring'
        };
      }
      return null;
    }).filter(Boolean);

    return alerts;
  };

  // Check if employee has functional restriction
  const hasFunctionalRestriction = (empId: string) => {
    const empRecords = records.filter(r => r.employeeId === empId && r.isMandatory);
    return empRecords.some(r => r.status === 'expired' || (r.expiryDate && isAfter(new Date(), new Date(r.expiryDate))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), formData);
      } else {
        await addDoc(collection(db, 'employees'), formData);
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
      setFormData({
        name: '',
        role: '',
        department: '',
        hireDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'active',
        email: '',
      });
    } catch (error) {
      handleFirestoreError(error, editingEmployee ? OperationType.UPDATE : OperationType.CREATE, 'employees');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário?')) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'employees');
      }
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-900 mb-2">Força de Trabalho</h2>
          <p className="text-stone-500 text-base md:text-lg">Gerencie perfis de funcionários e estrutura organizacional.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onBulkEdit}
            className="bg-white border border-stone-200 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all shadow-sm"
          >
            <Filter className="w-4 h-4" />
            Ações em Massa
          </button>
          <button 
            onClick={() => {
              setEditingEmployee(null);
              setFormData({
                name: '',
                role: '',
                department: '',
                hireDate: format(new Date(), 'yyyy-MM-dd'),
                status: 'active',
                email: '',
              });
              setIsModalOpen(true);
            }}
            className="bg-stone-900 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-stone-800 transition-all shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Funcionário
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-stone-100 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, cargo ou departamento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-stone-400">
            <span className="font-bold text-stone-900">{filteredEmployees.length}</span>
            <span>Funcionários Encontrados</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="px-8 py-5 text-xs font-bold text-stone-400 uppercase tracking-widest">Funcionário</th>
                <th className="px-8 py-5 text-xs font-bold text-stone-400 uppercase tracking-widest">Cargo e Depto</th>
                <th className="px-8 py-5 text-xs font-bold text-stone-400 uppercase tracking-widest">Data de Contratação</th>
                <th className="px-8 py-5 text-xs font-bold text-stone-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 md:px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-stone-100 items-center justify-center font-bold text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-base md:text-lg">{emp.name}</p>
                        <p className="text-xs md:text-sm text-stone-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-6">
                    <p className="font-bold text-stone-900 text-sm md:text-base">{emp.role}</p>
                    <p className="text-xs md:text-sm text-stone-400">{emp.department}</p>
                  </td>
                  <td className="px-4 md:px-8 py-6 hidden md:table-cell">
                    <p className="text-sm font-medium text-stone-600">{format(new Date(emp.hireDate), 'd/MM/yyyy')}</p>
                  </td>
                  <td className="px-4 md:px-8 py-6">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                        emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                        {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                      {hasFunctionalRestriction(emp.id) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                          <AlertCircle className="w-3 h-3" />
                          Restrição
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 md:gap-4">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        {getEmployeeTrainingAlerts(emp.id).slice(0, 2).map((alert, idx) => (
                          <div key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                            alert?.status === 'expired' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <span>{alert?.title}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingEmployee(emp);
                            setFormData({
                              name: emp.name,
                              role: emp.role,
                              department: emp.department,
                              hireDate: emp.hireDate,
                              status: emp.status,
                              email: emp.email,
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-10 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div>
                  <h3 className="text-xl md:text-3xl font-bold text-stone-900">{editingEmployee ? 'Editar Perfil' : 'Novo Funcionário'}</h3>
                  <p className="text-stone-500 text-xs md:text-sm">Insira os detalhes para o perfil do funcionário.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 md:p-3 text-stone-400 hover:text-stone-900 hover:bg-white rounded-2xl transition-all shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                      placeholder="ex: Sarah Jenkins"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Endereço de E-mail</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                      placeholder="sarah@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Cargo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                      placeholder="ex: Engenheiro Sênior"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Departamento</label>
                    <select 
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all appearance-none"
                    >
                      <option value="">Selecionar Depto</option>
                      <option value="Engineering">Engenharia</option>
                      <option value="Operations">Operações</option>
                      <option value="Safety">Segurança</option>
                      <option value="HR">RH</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Data de Contratação</label>
                    <input 
                      required
                      type="date" 
                      value={formData.hireDate}
                      onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
                      className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Status</label>
                    <div className="flex gap-4">
                      {[
                        { id: 'active', label: 'Ativo' },
                        { id: 'inactive', label: 'Inativo' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFormData({...formData, status: s.id as 'active' | 'inactive'})}
                          className={`flex-1 py-4 rounded-2xl border font-bold text-sm transition-all ${
                            formData.status === s.id 
                              ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                              : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {editingEmployee ? 'Salvar Alterações' : 'Criar Perfil'}
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
