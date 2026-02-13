
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Member } from '@/lib/types';
import { getMembershipStatus } from '@/lib/utils';

interface CheckInSuccessProps {
  member: Member | null;
  onDismiss: () => void;
}

export const CheckInSuccess: React.FC<CheckInSuccessProps> = ({ member, onDismiss }) => {
  useEffect(() => {
    if (member) {
      const timer = setTimeout(onDismiss, 2000);
      return () => clearTimeout(timer);
    }
  }, [member, onDismiss]);

  if (!member) return null;

  const status = getMembershipStatus(member);
  const isExpired = status === 'Expired';
  const color = isExpired ? 'red' : 'emerald';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className={`relative w-full max-w-md overflow-hidden rounded-3xl bg-neutral-900 border border-${color}-500/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 text-center`}
        >
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-${color}-500/20 mb-6 ring-4 ring-${color}-500/10`}>
            {isExpired ? (
              <X className={`h-12 w-12 text-${color}-500`} />
            ) : (
              <Check className={`h-12 w-12 text-${color}-500`} />
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            {isExpired ? 'Acceso Denegado' : '¡Bienvenido!'}
          </h2>
          <p className="text-xl text-neutral-400 mb-6">{member.nombre}</p>
          
          <div className={`inline-flex items-center rounded-full bg-${color}-500/10 px-4 py-2 text-${color}-400 ring-1 ring-inset ring-${color}-500/20`}>
            {status === 'Active' ? 'Plan Activo' : 'Plan Vencido'}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
