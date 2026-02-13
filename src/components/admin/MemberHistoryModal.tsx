
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '@/lib/types';
import { db } from '@/lib/db';
import { getMembershipStatus, formatDate, getExpirationDate } from '@/lib/utils';
import { Calendar, X, Clock, History } from 'lucide-react';

interface MemberHistoryModalProps {
  member: Member | null;
  onClose: () => void;
}

export const MemberHistoryModal: React.FC<MemberHistoryModalProps> = ({ member, onClose }) => {
  const [history, setHistory] = useState<Member[]>([]);

  useEffect(() => {
    if (member) {
      const fetchHistory = async () => {
        // Find all records with same name and phone, including deleted ones if they are part of history?
        // Usually history implies valid past plans.
        // Let's include everything matching name/phone to be safe.
        const records = await db.members
          .filter(m => m.nombre === member.nombre && m.telefono === member.telefono)
          .reverse()
          .toArray();
        setHistory(records);
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
                  const isCurrent = record.id === member.id;
                  
                  return (
                    <div 
                      key={record.id} 
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isCurrent 
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' 
                          : isExpired 
                            ? 'border-white/5 bg-white/5 opacity-80' 
                            : 'border-emerald-500/30 bg-emerald-500/5'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                          Actual
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-bold text-lg">{record.plan_tipo}</span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Registrado: {formatDate(record.fecha_inicio)}
                          </div>
                        </div>
                        {!isCurrent && (
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold mt-1 ${isExpired ? 'bg-neutral-800 text-neutral-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isExpired ? 'Vencido' : 'Activo'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm pt-3 border-t border-white/5">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="text-muted-foreground">Vence:</span>
                        <span className={`font-medium ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatDate(expirationDate)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 text-xs opacity-60">
                        <span>{record.notes ? `"${record.notes}"` : ''}</span>
                        <span className="font-mono">C$ {record.costo}</span>
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
