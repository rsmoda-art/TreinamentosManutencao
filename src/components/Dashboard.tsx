/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Users, CheckCircle2, AlertCircle, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Download, Calendar, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  color: string;
}

interface Employee {
  id: string;
  name: string;
}

interface TrainingModule {
  id: string;
  title: string;
}

interface TrainingRecord {
  id: string;
  employeeId: string;
  moduleId: string;
  status: 'completed' | 'pending' | 'expired';
  expiryDate?: string;
  isMandatory?: boolean;
}

function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-6">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-4xl font-bold text-stone-900 tracking-tight">{value}</h3>
    </div>
  );
}

interface DashboardProps {
  onTabChange: (tab: string) => void;
  onBulkEdit: () => void;
}

export default function Dashboard({ onTabChange, onBulkEdit }: DashboardProps) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    completedTraining: 0,
    pendingTraining: 0,
    expiredTraining: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'expired' | 'expiring'>('all');
  const [showEmailToast, setShowEmailToast] = useState(false);

  const managers = [
    'bruno.alcantara@raizen.com',
    'vicente.ferrari@raizen.com',
    'renan.moda@raizen.com',
    'ricardo.michelina@raizen.com',
    'fabio.souza2@raizen.com'
  ];

  const sendEmailNotification = (item: any) => {
    console.log(`[EMAIL SENT] To: ${managers.join(', ')}`);
    console.log(`Subject: ALERTA DE TREINAMENTO - ${item.employeeName}`);
    console.log(`Body: O treinamento "${item.moduleTitle}" do colaborador ${item.employeeName} está ${item.computedStatus === 'expired' ? 'EXPIRADO' : 'EM VENCIMENTO CRÍTICO'}. Vencimento: ${format(parseISO(item.expiryDate), 'dd/MM/yyyy')}`);
    setShowEmailToast(true);
    setTimeout(() => setShowEmailToast(false), 5000);
  };

  useEffect(() => {
    if (records.length > 0 && employees.length > 0) {
      const criticalOrExpired = getReportData().filter(item => item.computedStatus === 'expired' || item.isCritical);
      if (criticalOrExpired.length > 0) {
        // In a real app, we'd check if we already sent this notification
        // For demo purposes, we'll just trigger it once when data loads
        const timer = setTimeout(() => {
          sendEmailNotification(criticalOrExpired[0]); // Notify about the first one as an example
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [records.length, employees.length]);

  useEffect(() => {
    const employeesUnsubscribe = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        const empData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
        setEmployees(empData);
        setStats(prev => ({ ...prev, totalEmployees: snapshot.size }));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'employees')
    );

    const modulesUnsubscribe = onSnapshot(collection(db, 'modules'), (snapshot) => {
      setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TrainingModule[]);
    });

    const recordsUnsubscribe = onSnapshot(
      collection(db, 'records'),
      (snapshot) => {
        const recData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TrainingRecord[];
        setRecords(recData);
        
        const counts = {
          completed: 0,
          pending: 0,
          expired: 0,
        };
        const today = new Date();
        const next30Days = addDays(today, 30);
        
        recData.forEach(rec => {
          let computedStatus = rec.status;
          const expiryDate = rec.expiryDate ? parseISO(rec.expiryDate) : null;

          if (expiryDate) {
            if (isBefore(expiryDate, today)) {
              computedStatus = 'expired';
            } else if (isBefore(expiryDate, next30Days)) {
              computedStatus = 'pending';
            }
          }

          if (computedStatus === 'completed') counts.completed++;
          else if (computedStatus === 'pending') counts.pending++;
          else if (computedStatus === 'expired') counts.expired++;
        });
        setStats(prev => ({
          ...prev,
          completedTraining: counts.completed,
          pendingTraining: counts.pending,
          expiredTraining: counts.expired,
        }));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'records')
    );

    return () => {
      employeesUnsubscribe();
      modulesUnsubscribe();
      recordsUnsubscribe();
    };
  }, []);

  const getReportData = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const next30Days = addDays(today, 30);
    
    // Critical range: 01/04 to 01/11 of current year
    const criticalStart = new Date(currentYear, 3, 1); // April 1st
    const criticalEnd = new Date(currentYear, 10, 1); // November 1st

    return records
      .map(rec => {
        const employee = employees.find(e => e.id === rec.employeeId);
        const module = modules.find(m => m.id === rec.moduleId);
        const expiryDate = rec.expiryDate ? parseISO(rec.expiryDate) : null;
        
        let status = rec.status;
        let isCritical = false;

        if (expiryDate) {
          if (isBefore(expiryDate, today)) {
            status = 'expired';
          } else if (isBefore(expiryDate, next30Days)) {
            status = 'pending'; // Expiring soon
          }

          // Check for critical range
          if (isAfter(expiryDate, criticalStart) && isBefore(expiryDate, criticalEnd)) {
            isCritical = true;
          }
        }

        const item = {
          ...rec,
          employeeName: employee?.name || 'Desconhecido',
          moduleTitle: module?.title || 'Desconhecido',
          computedStatus: status,
          expiryDateObj: expiryDate,
          isCritical
        };

        // Simulated automatic email trigger for critical/expired
        if (status === 'expired' || isCritical) {
          // In a real app, this would be handled by a backend job or a more controlled trigger
          // For now, we'll just log it when the data is processed
          // sendEmailNotification(item);
        }

        return item;
      })
      .filter(item => {
        if (reportFilter === 'expired') return item.computedStatus === 'expired';
        if (reportFilter === 'expiring') return (item.computedStatus === 'pending' || item.isCritical) && item.expiryDate;
        return true;
      })
      .sort((a, b) => {
        if (!a.expiryDateObj) return 1;
        if (!b.expiryDateObj) return -1;
        return a.expiryDateObj.getTime() - b.expiryDateObj.getTime();
      });
  };

  const reportData = getReportData();
  
  const totalRecords = stats.completedTraining + stats.pendingTraining + stats.expiredTraining || 1;
  const activeEmployees = employees.filter(e => (e as any).status === 'active').length;
  
  const activePercent = employees.length > 0 ? Math.round((activeEmployees / employees.length) * 100) : 0;
  const completedPercent = Math.round((stats.completedTraining / totalRecords) * 100);
  const pendingPercent = Math.round((stats.pendingTraining / totalRecords) * 100);
  const expiredPercent = Math.round((stats.expiredTraining / totalRecords) * 100);

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Relatório de Treinamentos', 14, 22);
    
    // Add subtitle/date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    
    // Define table columns
    const tableColumn = ["Funcionário", "Treinamento", "Vencimento", "Status"];
    
    // Define table rows
    const tableRows = reportData.map(item => [
      item.employeeName,
      item.moduleTitle + (item.isMandatory ? ' (Obrigatório)' : ''),
      item.expiryDate ? format(parseISO(item.expiryDate), 'dd/MM/yyyy') : 'N/A',
      item.computedStatus === 'expired' ? 'Expirado' :
      item.isCritical ? 'Vencimento Crítico' :
      item.computedStatus === 'pending' ? 'A Vencer' :
      'Válido'
    ]);

    // Generate table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 9, cellPadding: 4 }
    });

    // Save PDF
    doc.save(`relatorio_treinamentos_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  return (
    <div className="space-y-8 md:space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-900 mb-2">Visão Geral</h2>
          <p className="text-stone-500 text-base md:text-lg">Métricas de conformidade de treinamento em tempo real em toda a organização.</p>
        </div>
        <div className="bg-white border border-stone-200 px-4 md:px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm self-start md:self-auto">
          <TrendingUp className="w-5 h-5 text-stone-400" />
          <span className="text-sm font-semibold text-stone-600">Taxa de Conformidade: </span>
          <span className="text-sm font-bold text-stone-900">
            {stats.totalEmployees > 0 
              ? Math.round((stats.completedTraining / (stats.completedTraining + stats.pendingTraining + stats.expiredTraining || 1)) * 100) 
              : 0}%
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {/* Toast Notification */}
        <AnimatePresence>
          {showEmailToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 right-8 z-50 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-stone-800"
            >
              <div className="p-2 bg-emerald-500 rounded-xl">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">E-mail enviado aos gestores</p>
                <p className="text-xs text-stone-400">Notificação de vencimento crítico/expirado disparada.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <StatCard 
          label="Total de Funcionários" 
          value={stats.totalEmployees} 
          icon={Users} 
          trend={{ value: `${activePercent}% Ativos`, positive: true }}
          color="bg-stone-900" 
        />
        <StatCard 
          label="Concluídos" 
          value={stats.completedTraining} 
          icon={CheckCircle2} 
          trend={{ value: `${completedPercent}%`, positive: true }}
          color="bg-emerald-500" 
        />
        <StatCard 
          label="Pendentes" 
          value={stats.pendingTraining} 
          icon={Clock} 
          trend={{ value: `${pendingPercent}%`, positive: false }}
          color="bg-amber-500" 
        />
        <StatCard 
          label="Expirados" 
          value={stats.expiredTraining} 
          icon={AlertCircle} 
          trend={{ value: `${expiredPercent}%`, positive: false }}
          color="bg-rose-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Relatório de Treinamentos */}
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-stone-900">Relatório de Treinamentos</h3>
              <p className="text-stone-500 text-xs md:text-sm">Acompanhamento de vencimentos e conformidade.</p>
            </div>
            <div className="flex gap-2">
              <select 
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-600 outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              >
                <option value="all">Todos</option>
                <option value="expired">Expirados</option>
                <option value="expiring">A Vencer (30 dias)</option>
              </select>
              <button 
                onClick={downloadPDF}
                className="p-2 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors"
                title="Download PDF"
              >
                <Download className="w-4 h-4 text-stone-600" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-stone-100">
                  <th className="pb-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Funcionário</th>
                  <th className="pb-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Treinamento</th>
                  <th className="pb-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Vencimento</th>
                  <th className="pb-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {reportData.length > 0 ? (
                  reportData.map((item) => (
                    <tr key={item.id} className="group hover:bg-stone-50 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-stone-900">{item.employeeName}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-stone-600">{item.moduleTitle}</p>
                        {item.isMandatory && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Obrigatório</span>}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-stone-500">
                          <Calendar className="w-3 h-3" />
                          <span className="text-sm font-medium">
                            {item.expiryDate ? format(parseISO(item.expiryDate), 'dd/MM/yyyy') : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          item.computedStatus === 'expired' ? 'bg-rose-50 text-rose-600' :
                          item.isCritical ? 'bg-orange-50 text-orange-600' :
                          item.computedStatus === 'pending' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.computedStatus === 'expired' ? 'Expirado' :
                           item.isCritical ? 'Vencimento Crítico' :
                           item.computedStatus === 'pending' ? 'A Vencer' :
                           'Válido'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-stone-400 italic">Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-stone-900 p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl md:text-2xl font-bold mb-4">Ações Rápidas</h3>
              <p className="text-stone-400 text-sm mb-8 md:mb-10">Gerencie sua força de trabalho com eficiência com estes atalhos.</p>
              <div className="space-y-4">
                <button 
                  onClick={() => onTabChange('employees')}
                  className="w-full bg-white text-stone-900 py-4 rounded-2xl font-bold hover:bg-stone-100 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Adicionar Funcionário
                </button>
                <button 
                  onClick={() => onTabChange('schedule')}
                  className="w-full bg-stone-800 text-white py-4 rounded-2xl font-bold hover:bg-stone-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Agendar Treinamento
                </button>
                <button 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + "Funcionario,Treinamento,Vencimento,Status\n"
                      + reportData.map(e => `${e.employeeName},${e.moduleTitle},${e.expiryDate},${e.computedStatus}`).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "relatorio_treinamentos.csv");
                    document.body.appendChild(link);
                    link.click();
                  }}
                  className="w-full bg-stone-800 text-white py-4 rounded-2xl font-bold hover:bg-stone-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Gerar Relatório
                </button>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-stone-800 rounded-full opacity-50 blur-3xl" />
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm">
            <h3 className="text-xl font-bold text-stone-900 mb-6">Resumo de Alertas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span className="text-sm font-bold text-rose-900">Expirados</span>
                </div>
                <span className="text-lg font-bold text-rose-900">{stats.expiredTraining}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-900">A Vencer</span>
                </div>
                <span className="text-lg font-bold text-amber-900">{stats.pendingTraining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
