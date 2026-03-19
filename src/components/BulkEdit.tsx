/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Check, X, Users, Filter, Search, AlertCircle, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
}

interface BulkEditProps {
  onCancel: () => void;
}

export default function BulkEdit({ onCancel }: BulkEditProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive' | ''>('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'employees')
    );
    return () => unsubscribe();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || (!newStatus && !newDepartment)) return;
    
    setIsSaving(true);
    const batch = writeBatch(db);
    
    selectedIds.forEach(id => {
      const updateData: any = {};
      if (newStatus) updateData.status = newStatus;
      if (newDepartment) updateData.department = newDepartment;
      batch.update(doc(db, 'employees', id), updateData);
    });

    try {
      await batch.commit();
      onCancel();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'employees');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-5xl font-bold tracking-tight text-stone-900 mb-2">Ações em Massa</h2>
          <p className="text-stone-500 text-lg">Atualize múltiplos registros de funcionários simultaneamente.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="bg-white border border-stone-200 px-8 py-3 rounded-2xl text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all shadow-sm"
          >
            Cancelar
          </button>
          <button 
            disabled={selectedIds.size === 0 || (!newStatus && !newDepartment) || isSaving}
            onClick={handleBulkUpdate}
            className="bg-stone-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold hover:bg-stone-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : `Atualizar ${selectedIds.size} Registros`}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Selection Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
              <div className="relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Buscar funcionários..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                />
              </div>
              <button 
                onClick={toggleSelectAll}
                className="text-xs font-bold text-stone-400 uppercase tracking-widest hover:text-stone-900 transition-colors"
              >
                {selectedIds.size === filteredEmployees.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-1 divide-y divide-stone-50">
                {filteredEmployees.map(emp => (
                  <div 
                    key={emp.id} 
                    onClick={() => toggleSelect(emp.id)}
                    className={`p-6 flex items-center gap-6 cursor-pointer transition-all ${
                      selectedIds.has(emp.id) ? 'bg-stone-900 text-white' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(emp.id) ? 'bg-white border-white text-stone-900' : 'border-stone-200 bg-white'
                    }`}>
                      {selectedIds.has(emp.id) && <Check className="w-4 h-4" />}
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center font-bold text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{emp.name}</p>
                      <p className={`text-sm ${selectedIds.has(emp.id) ? 'text-stone-400' : 'text-stone-500'}`}>
                        {emp.role} • {emp.department}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      emp.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Column */}
        <div className="space-y-8">
          <div className="bg-stone-50 p-10 rounded-[2.5rem] border border-stone-200 shadow-sm sticky top-10">
            <h3 className="text-2xl font-bold text-stone-900 mb-8">Configurações de Atualização</h3>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Alterar Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'active', label: 'Ativo' },
                    { id: 'inactive', label: 'Inativo' }
                  ].map(status => (
                    <button
                      key={status.id}
                      onClick={() => setNewStatus(status.id as any)}
                      className={`py-4 rounded-2xl border font-bold text-sm transition-all ${
                        newStatus === status.id 
                          ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                          : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Mover para Departamento</label>
                <select 
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all appearance-none"
                >
                  <option value="">Sem Alteração</option>
                  <option value="Engineering">Engenharia</option>
                  <option value="Operations">Operações</option>
                  <option value="Safety">Segurança</option>
                  <option value="HR">RH</option>
                </select>
              </div>

              <div className="pt-8 border-t border-stone-200">
                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Esta ação atualizará <span className="font-bold">{selectedIds.size}</span> registros de funcionários selecionados. Isso não pode ser desfeito.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
