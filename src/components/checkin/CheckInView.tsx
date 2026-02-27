
'use client';
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Member } from '@/lib/types';
import { getMembershipStatus } from '@/lib/utils';
import { MemberCard } from './MemberCard';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';
import { CheckInSuccess } from './CheckInSuccess';
import { AnimatePresence } from 'framer-motion';

export default function CheckInView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<{ member: Member; timestamp: number } | null>(null);

  // Force re-render on time travel
  const [timeTick, setTimeTick] = useState(0);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const handleTimeChange = () => setTimeTick(t => t + 1);
    window.addEventListener('time-travel-changed', handleTimeChange);
    return () => window.removeEventListener('time-travel-changed', handleTimeChange);
  }, []);

  const members = useLiveQuery(async () => {
    if (!searchTerm) return [];
    
    const lower = searchTerm.toLowerCase();
    const isPhone = /^\d+$/.test(lower);
    
    let results = [];
    
    if (isPhone) {
      results = await db.members
        .where('telefono')
        .startsWith(searchTerm)
        .filter(m => !m.deleted)
        .toArray();
    } else {
      results = await db.members
        .filter(m => !m.deleted && m.nombre.toLowerCase().includes(lower))
        .toArray();
    }

    // Filter for active plans only
    return results.filter(m => getMembershipStatus(m) === 'Active').slice(0, 10);
  }, [searchTerm, timeTick]);

  const handleCheckIn = async (member: Member) => {
    if (!member.id) return;
    
    try {
      await db.attendances.add({
        miembroId: member.id!,
        memberId: member.memberId, // Link to User Identity
        fecha_hora: new Date(),
      });
      setLastCheckIn({ member, timestamp: Date.now() });
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
        {members?.map((member) => (
          <MemberCard key={member.id} member={member} onClick={handleCheckIn} />
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
            member={lastCheckIn.member} 
            onDismiss={() => setLastCheckIn(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
