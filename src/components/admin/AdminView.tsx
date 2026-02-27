'use client';
import React, { useState } from 'react';
import { db } from '@/lib/db';
import { PlanType, SystemPlan } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMembershipStatus, formatDate, getExpirationDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Trash2, Edit, UserPlus, Phone, CheckCircle, Calendar, CreditCard, Search, RefreshCcw, LogOut, Users } from 'lucide-react';
import { MemberHistoryModal } from './MemberHistoryModal';
import { AttendanceReport } from './AttendanceReport';
import { SyncButton } from '@/components/layout/SyncButton';
import { useAuthStore } from '@/lib/store';

interface AdminViewProps {
  onLogout?: () => void;
}

export default function AdminView({ onLogout }: AdminViewProps) {
  const [view, setView] = useState<'members' | 'report'>('members');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [plan, setPlan] = useState<PlanType>('');
  const [costo, setCosto] = useState<string>('');
  const [isPromo, setIsPromo] = useState(false);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Identity management
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Force re-render on time travel
  const [timeTick, setTimeTick] = useState(0);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const handleTimeChange = () => setTimeTick(t => t + 1);
    window.addEventListener('time-travel-changed', handleTimeChange);
    return () => window.removeEventListener('time-travel-changed', handleTimeChange);
  }, []);
  
  // Search state for members list
  const [membersSearchTerm, setMembersSearchTerm] = useState('');
  const [selectedHistoryMember, setSelectedHistoryMember] = useState<any>(null);
  const [dbPlans, setDbPlans] = useState<SystemPlan[]>([]);

  // Fetch plans on mount
  React.useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase.from('plans').select('*').eq('active', true).order('price', { ascending: false });
      if (data) {
        setDbPlans(data as SystemPlan[]);
        if (!plan && data.length > 0) {
          setPlan(data[0].description);
        }
      }
    }
    fetchPlans();
  }, []);

  const members = useLiveQuery(async () => {
    // Fetch active (non-deleted) members
    let collection = db.members.filter(m => !m.deleted);
    
    // Apply search filter if present
    if (membersSearchTerm) {
      const lower = membersSearchTerm.toLowerCase();
      collection = collection.and(m => 
        m.nombre.toLowerCase().includes(lower) || 
        m.telefono.includes(lower)
      );
    }
    
    const rawResults = await collection.reverse().toArray();
    
    // Deduplicate: Keep only the latest record for each unique memberId
    const uniqueMembers = new Map();
    rawResults.forEach(member => {
      const key = member.memberId || member.nombre.toLowerCase().trim(); // Fallback to name if migration failed (shouldn't happen)
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, member);
      }
    });
    
    return Array.from(uniqueMembers.values());
  }, [membersSearchTerm, timeTick]);

  // Name Autocomplete
  React.useEffect(() => {
    // Only search if name is long enough and we are not currently editing a specific record (unless we want to reassign ID?)
    // And don't search if we just selected a suggestion (avoid loops, though 'nombre' change triggers this).
    // We'll handle selection by clearing suggestions.
    if (nombre.length < 2 || editingId) {
      setNameSuggestions([]);
      return;
    }
    
    // Debounce or just query
    const timer = setTimeout(async () => {
        try {
            const results = await db.members
                .filter(m => !m.deleted && m.nombre.toLowerCase().includes(nombre.toLowerCase()))
                .limit(20)
                .toArray();
            
            // Dedupe suggestions by memberId
            const unique = new Map();
            results.forEach(m => {
                if (m.memberId && !unique.has(m.memberId)) {
                    unique.set(m.memberId, m);
                }
            });
            // Filter out current selection if strictly matching? No, show all matches.
            setNameSuggestions(Array.from(unique.values()));
            setShowSuggestions(true);
        } catch (e) {
            console.error(e);
        }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nombre, editingId]);

  // Auto-update price suggestion when plan changes
  React.useEffect(() => {
    if (editingId) return; // Don't auto-change price if editing
    const selectedPlan = dbPlans.find(p => p.description === plan);
    if (selectedPlan) {
      setCosto(selectedPlan.price.toString());
    }
  }, [plan, editingId, dbPlans]);

  const selectSuggestion = (member: any) => {
      setNombre(member.nombre);
      setTelefono(member.telefono || '');
      setSelectedMemberId(member.memberId);
      setNameSuggestions([]);
      setShowSuggestions(false);
  };

  const user = useAuthStore(state => state.user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo) return;

    try {
      const selectedSysPlan = dbPlans.find(p => p.description === plan);
      const planDays = selectedSysPlan?.days_active;

      if (editingId) {
        // Updating a specific record. Keep existing memberId (or add if missing)
        await db.members.update(editingId, {
          nombre,
          telefono,
          plan_tipo: plan,
          ...(planDays ? { plan_days: planDays } : {}),
          costo: Number(costo),
          is_promo: isPromo,
          notes: notes,
          registered_by: user?.staffId,
          registered_by_name: user?.nombre,
          synced: 0,
          updated_at: new Date(),
          // Do not overwrite memberId if it exists, but ensured by update partial
        });
        setEditingId(null);
      } else {
        // Creating new plan (Renewal or New User)
        // Use selectedMemberId if available, else new UUID
        const memberId = selectedMemberId || crypto.randomUUID();
        
        await db.members.add({
          memberId,
          nombre,
          telefono,
          plan_tipo: plan,
          ...(planDays ? { plan_days: planDays } : {}),
          costo: Number(costo),
          is_promo: isPromo,
          notes: notes,
          fecha_inicio: new Date(),
          registered_by: user?.staffId,
          registered_by_name: user?.nombre,
          updated_at: new Date(),
        });
      }
      
      setSuccess(true);
      setNombre('');
      setTelefono('');
      setNotes('');
      setIsPromo(false);
      setEditingId(null);
      setSelectedMemberId(null);
      setNameSuggestions([]);
      // Reset plan default
      if (dbPlans.length > 0) {
        setPlan(dbPlans[0].description);
        setCosto(dbPlans[0].price.toString());
      } else {
        setPlan('');
        setCosto('');
      }
      
      setTimeout(() => setSuccess(false), 3000);
      window.dispatchEvent(new Event('request-sync'));
    } catch (error) {
      console.error('Error adding/updating member:', error);
    }
  };

  const handleEdit = (member: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(member.id);
    setSelectedMemberId(member.memberId); // Track ID
    setNombre(member.nombre);
    setTelefono(member.telefono || '');
    setPlan(member.plan_tipo);
    setCosto(member.costo.toString());
    setIsPromo(!!member.is_promo);
    setNotes(member.notes || '');
    setNameSuggestions([]); // Clear suggestions
  };

  const handleRenew = (member: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null); // New record
    setSelectedMemberId(member.memberId); // Reuse Identity
    setNombre(member.nombre);
    setTelefono(member.telefono || '');
    setPlan(member.plan_tipo);
    setCosto(member.costo.toString());
    setIsPromo(!!member.is_promo);
    setNotes(member.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNameSuggestions([]);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      await db.members.update(id, { deleted: true, synced: 0, updated_at: new Date() });
      window.dispatchEvent(new Event('request-sync'));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedMemberId(null);
    setNombre('');
    setTelefono('');
    setNotes('');
    setIsPromo(false);
    if (dbPlans.length > 0) {
      setPlan(dbPlans[0].description);
      setCosto(dbPlans[0].price.toString());
    } else {
      setPlan('');
      setCosto('');
    }
    setNameSuggestions([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            {view === 'members' ? <UserPlus className="h-8 w-8 text-primary" /> : <Calendar className="h-8 w-8 text-primary" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Administración</h1>
            <p className="text-muted-foreground">
              {view === 'members' ? 'Registro y control de miembros.' : 'Reporte de Accesos y Asistencia.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-card/50 border border-white/10 p-1 rounded-xl">
              <button 
                  onClick={() => setView('members')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'members' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
              >
                  Miembros
              </button>
              <button 
                  onClick={() => setView('report')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'report' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
              >
                  Asistencias
              </button>
          </div>
          <SyncButton />
            <button 
              onClick={onLogout}
              className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/10"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
        </div>
      </div>

      {view === 'members' ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Form */}
        <Card className="border-primary/20 bg-card/40 backdrop-blur-xl shadow-2xl h-fit">
          <CardHeader>
             <CardTitle className="text-xl flex justify-between items-center">
               {editingId ? 'Editar Miembro' : 'Nuevo Registro'}
               {editingId && (
                 <button onClick={handleCancelEdit} className="text-xs text-muted-foreground hover:text-white border px-2 py-1 rounded">
                   Cancelar
                 </button>
               )}
             </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Nombre</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nombre Completo" 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="pl-10 h-12 text-base"
                    autoComplete="off"
                    onFocus={() => { if (nameSuggestions.length > 0) setShowSuggestions(true); }}
                  />
                  {/* Suggestions Dropdown */}
                  {showSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {nameSuggestions.map(s => {
                          const status = getMembershipStatus(s);
                          return (
                            <div 
                                key={s.id} 
                                className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                                onClick={() => selectSuggestion(s)}
                            >
                                <div>
                                    <div className="font-bold text-sm">{s.nombre}</div>
                                    <div className="text-xs text-muted-foreground">{s.telefono}</div>
                                </div>
                                <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {status === 'Active' ? 'Activo' : 'Vencido'}
                                </div>
                            </div>
                          );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Teléfono (Opcional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Teléfono" 
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    type="tel"
                    className="pl-10 h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-muted-foreground ml-1">Plan</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {dbPlans.map(sysPlan => (
                    <button
                      key={sysPlan.id}
                      type="button"
                      onClick={() => setPlan(sysPlan.description)}
                      className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all ${
                        plan === sysPlan.description 
                          ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20' 
                          : 'border-muted bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Calendar className="h-8 w-8 mb-2" />
                      <span className="font-bold text-sm sm:text-base text-center break-words px-2">{sysPlan.description}</span>
                    </button>
                  ))}
                  {dbPlans.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-4">Cargando planes...</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Precio</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">C$</span>
                    <Input 
                      placeholder="0" 
                      value={costo}
                      onChange={(e) => setCosto(e.target.value)}
                      type="number"
                      className="pl-8 h-12 font-mono text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Promo</label>
                  <button
                    type="button"
                    onClick={() => setIsPromo(!isPromo)}
                    className={`flex items-center justify-center w-full h-12 rounded-lg border transition-all text-sm font-bold ${
                      isPromo 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
                        : 'border-muted bg-card hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {isPromo ? 'Aplicada' : 'No'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-medium text-muted-foreground ml-1">Notas</label>
                 <textarea
                   className="flex w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[60px]"
                   placeholder="Notas opcionales..."
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                 />
              </div>

              <Button 
                type="submit" 
                className={`w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/25 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                disabled={!nombre || !costo}
              >
                {success ? (
                  <span className="flex items-center animate-pulse">
                    <CheckCircle className="mr-2 h-5 w-5" /> {editingId ? 'Actualizado' : 'Guardado'}
                  </span>
                ) : (
                  editingId ? 'Actualizar Miembro' : 'Registrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Members List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold ml-1">Miembros Recientes</h2>
          </div>
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o teléfono..." 
              value={membersSearchTerm}
              onChange={(e) => setMembersSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-card/50"
            />
          </div>

          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {members?.map((member) => {
              const status = getMembershipStatus(member);
              const isExpired = status === 'Expired';
              const expirationDate = getExpirationDate(member);

              return (
                <Card 
                  key={member.id} 
                  className={`border-white/5 bg-card/60 transition-all cursor-pointer hover:bg-card/80 hover:border-primary/30 ${editingId === member.id ? 'border-primary ring-2 ring-primary/50' : ''}`}
                  onClick={() => setSelectedHistoryMember(member)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{member.nombre}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {member.telefono && <span className="flex items-center"><Phone size={12} className="mr-1"/> {member.telefono}</span>}
                        <span className="flex items-center text-xs bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          {member.plan_tipo}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs mt-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar size={10} /> Expira:
                        </span>
                        <span className={`font-medium ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatDate(expirationDate)}
                        </span>
                      </div>
                      
                      {member.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/20 pl-2">
                          "{member.notes}"
                        </p>
                      )}
                      
                      {member.registered_by_name && (
                         <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 opacity-70">
                            <Users size={10} /> Reg: {member.registered_by_name}
                         </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={`text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                        isExpired ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isExpired ? 'Vencido' : 'Activo'}
                      </div>
                      <div className="text-sm font-mono opacity-70">
                        C$ {member.costo}
                        {member.is_promo && <span className="text-emerald-400 ml-1 text-xs" title="Promo Aplicada">★</span>}
                      </div>
                      
                      {!isExpired ? (
                        <div className="flex gap-2 mt-1">
                          <button 
                             onClick={(e) => handleEdit(member, e)}
                             className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors z-10"
                             title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                             onClick={(e) => handleDelete(member.id!, e)}
                             className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors z-10"
                             title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-1">
                          <button 
                             onClick={(e) => handleRenew(member, e)}
                             className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                             title="Renovar Suscripción"
                          >
                            <RefreshCcw size={12} /> Renovar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {members?.length === 0 && (
              <div className="text-center py-10 opacity-50">No hay miembros registrados.</div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <AttendanceReport />
      )}
      
      {/* History Modal */}
      <MemberHistoryModal 
        member={selectedHistoryMember} 
        onClose={() => setSelectedHistoryMember(null)} 
      />
    </div>
  );
}
