
import React from 'react';
import { Member, MemberPlan } from '@/lib/types';
import { getMembershipStatus, formatDate, getExpirationDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { motion } from 'framer-motion';

export interface CombinedMember {
  member: Member;
  plan: MemberPlan;
}

interface MemberCardProps {
  data: CombinedMember;
  onClick: (data: CombinedMember) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ data, onClick }) => {
  const { member, plan } = data;
  const status = getMembershipStatus(plan);
  const isExpired = status === 'Expired';
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(data)}
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
            </div>
          </div>
          
          <StatusBadge status={status} size="lg" />
        </div>
      </Card>
    </motion.div>
  );
};
