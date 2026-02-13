
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'Active' | 'Expired';
  className?: string;
  size?: 'sm' | 'lg';
}

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const isExpired = status === 'Expired';
  
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wide border",
        {
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]': !isExpired,
          'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]': isExpired,
          'px-6 py-2 text-base': size === 'lg',
          'px-3 py-1 text-xs': size === 'sm',
        },
        className
      )}
    >
      {isExpired ? <AlertCircle className="mr-2 h-5 w-5" /> : <CheckCircle className="mr-2 h-5 w-5" />}
      {isExpired ? 'Pago Vencido' : 'Plan Activo'}
    </div>
  );
}
