
'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, MemberPlan } from '@/lib/types';
import { getMembershipStatus, getCurrentDate } from '@/lib/utils';
import { MemberCard, CombinedMember } from './MemberCard';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';
import { CheckInSuccess } from './CheckInSuccess';
import { AnimatePresence } from 'framer-motion';

export default function CheckInView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<{ data: CombinedMember; timestamp: number } | null>(null);

  // Force re-render on time travel
  const [timeTick, setTimeTick] = useState(0);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const handleTimeChange = () => setTimeTick(t => t + 1);
    window.addEventListener('time-travel-changed', handleTimeChange);
    return () => window.removeEventListener('time-travel-changed', handleTimeChange);
  }, []);

  const [members, setMembers] = useState<CombinedMember[]>([]);

  const fetchMembers = async () => {
    if (!searchTerm) {
      setMembers([]);
      return;
    }
    
    const lower = searchTerm.toLowerCase();
    const isPhone = /^\d+$/.test(lower);
    
    let query = supabase.from('members').select('*').eq('deleted', false);
    
    if (isPhone) {
        // Find exact or starts-with local equivalent logic
        query = query.like('telefono', `${searchTerm}%`);
    } else {
        query = query.ilike('nombre', `%${lower}%`);
    }

    const { data: results, error } = await query;
    
    if (error || !results) {
        setMembers([]);
        return;
    }

    // Deduplicate and combine with plans: Keep only the latest record for each unique memberId
    const uniqueMembers = new Map<string, Member>();
    results.forEach(member => {
      const key = member.memberId || member.nombre.toLowerCase().trim();
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, member);
      }
    });

    const combinedResults: CombinedMember[] = [];
    const memberIds = Array.from(uniqueMembers.keys());

    if (memberIds.length > 0) {
      const { data: plans } = await supabase.from('member_plans')
         .select('*')
         .in('memberId', memberIds)
         .eq('deleted', false)
         .order('fecha_inicio', { ascending: false });

      if (plans) {
          for (const m of Array.from(uniqueMembers.values())) {
             const memberPlans = plans.filter(p => p.memberId === m.memberId);
             if (memberPlans.length > 0) {
                combinedResults.push({ member: m, plan: memberPlans[0] });
             }
          }
      }
    }

    // Filter for active plans only
    const activeMembers = combinedResults
        .filter(c => getMembershipStatus(c.plan) === 'Active')
        .slice(0, 10);
        
    setMembers(activeMembers);
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
        fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, timeTick]);

  React.useEffect(() => {
     const handleSync = () => fetchMembers();
     window.addEventListener('request-sync', handleSync);
     return () => window.removeEventListener('request-sync', handleSync);
  }, [searchTerm]);

  const handleCheckIn = async (data: CombinedMember) => {
    const { member, plan } = data;
    if (!member.memberId || !plan.id) return;
    
    try {
      await supabase.from('attendances').insert({
        memberId: member.memberId,
        member_plan_id: plan.id,
        fecha_hora: getCurrentDate().toISOString(),
      });
      setLastCheckIn({ data, timestamp: Date.now() });
      setSearchTerm(''); // clear search after check-in
      window.dispatchEvent(new Event('request-sync'));
    } catch (e) {
      console.error('Failed to log attendance', e);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <img src="/logo.png" alt="Nova Fit" className="h-24 w-auto drop-shadow-lg rounded-3xl" />
        </div>
        <p className="text-muted-foreground text-lg">Check-in de Asistencia</p>
      </div>

      {/* Search Area */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          placeholder="Buscar miembro... (Nombre o Teléfono)"
          className="pl-12 h-16 text-xl rounded-2xl bg-card/30 backdrop-blur-md border-white/5 focus:border-primary/50 shadow-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 custom-scrollbar">
        {members?.map((combined) => (
          <MemberCard key={combined.plan.id} data={combined} onClick={handleCheckIn} />
        ))}
        {searchTerm && members?.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No se encontraron miembros.
          </div>
        )}
        {!searchTerm && (
          <div className="text-center py-20 opacity-20">
            <Search className="h-24 w-24 mx-auto mb-4" />
            <p className="text-2xl">Empieza a escribir para buscar...</p>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {lastCheckIn && (
          <CheckInSuccess 
            key={lastCheckIn.timestamp} // Force remount on new check-in
            data={lastCheckIn.data} 
            onDismiss={() => setLastCheckIn(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
