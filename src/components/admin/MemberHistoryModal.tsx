
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member, MemberPlan } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getMembershipStatus, formatDate, getExpirationDate } from '@/lib/utils';
import { Calendar, X, Clock, History, Edit, Trash2 } from 'lucide-react';

interface MemberHistoryModalProps {
  member: Member | null;
  onClose: () => void;
  onEdit?: (plan: MemberPlan) => void;
}

export const MemberHistoryModal: React.FC<MemberHistoryModalProps> = ({ member, onClose, onEdit }) => {
  const [history, setHistory] = useState<MemberPlan[]>([]);

  useEffect(() => {
    if (member) {
      const fetchHistory = async () => {
        const { data: records, error } = await supabase
          .from('member_plans')
          .select('*')
          .eq('memberId', member.memberId)
          .eq('deleted', false)
          .order('fecha_inicio', { ascending: false });
          
        if (!error && records) {
          const sorted = (records as MemberPlan[]).sort((a, b) => {
            const statA = getMembershipStatus(a);
            const statB = getMembershipStatus(b);
            const score = { 'Active': 3, 'Scheduled': 2, 'Expired': 1 };
            const wA = score[statA as keyof typeof score] || 0;
            const wB = score[statB as keyof typeof score] || 0;
            if (wA !== wB) return wB - wA;
            return new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime();
          });
          setHistory(sorted);
        }
      };
      fetchHistory();
    }
  }, [member]);

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Historial de Planes
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {member.nombre}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Cargando historial...</p>
                </div>
              ) : (
                history.map((record) => {
                  const status = getMembershipStatus(record);
                  const isExpired = status === 'Expired';
                  const expirationDate = getExpirationDate(record);
                  // The "Current" plan is probably the one with the latest fecha_inicio, 
                  // or the one that is 'Active'. Let's mark active ones as current.
                  const isCurrent = !isExpired && status === 'Active';
                  
                  return (
                    <div 
                      key={record.id} 
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isCurrent 
                          ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20' 
                          : isExpired 
                            ? 'border-white/5 bg-white/5 opacity-80' 
                            : 'border-amber-500/30 bg-amber-500/5'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          Actual
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-bold text-lg">{record.plan_tipo}</span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Registrado: {formatDate((record as any).created_at || record.fecha_inicio)}
                          </div>
                        </div>
                        {!isCurrent && (
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold mt-1 ${isExpired ? 'bg-neutral-800 text-neutral-400' : 'bg-amber-500/20 text-amber-500'}`}>
                            {isExpired ? 'Vencido' : 'Agendado'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground flex items-center gap-1 w-[70px]">
                            <Calendar size={14} /> Inicio:
                          </span>
                          <span className="font-medium text-white/90">
                            {formatDate(record.fecha_inicio)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground flex items-center gap-1 w-[70px]">
                            <Calendar size={14} /> Vence:
                          </span>
                          <span className={`font-medium ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatDate(expirationDate)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mt-3 pt-3 border-t border-white/5 opacity-90">
                        <div className="flex flex-col text-xs space-y-1">
                          {record.notes && <span className="italic text-muted-foreground">"{record.notes}"</span>}
                          <span className="font-mono">C$ {record.costo}</span>
                        </div>
                        <div className="flex gap-2">
                          {!isExpired && onEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEdit(record); }}
                              className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                              title="Editar Plan"
                            >
                              <Edit size={14} /> Editar
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm('¿Estás seguro de eliminar este plan del historial?')) {
                                await supabase.from('member_plans').update({ deleted: true, updated_at: new Date().toISOString() }).eq('id', record.id);
                                window.dispatchEvent(new Event('request-sync'));
                                setHistory(prev => prev.filter(p => p.id !== record.id));
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                            title="Eliminar Plan"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
