
import React from 'react';
import { Member } from '@/lib/types';
import { getMembershipStatus, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { User, Phone, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemberCardProps {
  member: Member;
  onClick: (member: Member) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onClick }) => {
  const status = getMembershipStatus(member);
  const isExpired = status === 'Expired';
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(member)}
      className="cursor-pointer"
    >
      <Card className={`relative overflow-hidden group hover:border-primary/50 transition-colors ${isExpired ? 'border-red-500/30' : 'border-emerald-500/30'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
        
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-6">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {member.nombre.charAt(0).toUpperCase()}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{member.nombre}</h3>
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1"><Phone size={14} /> {member.telefono}</span>
                <span className="flex items-center gap-1"><Calendar size={14} /> {member.plan_tipo} {member.costo ? `(C$ ${member.costo})` : ''}</span>
              </div>
            </div>
          </div>
          
          <StatusBadge status={status} size="lg" />
        </div>
      </Card>
    </motion.div>
  );
};
