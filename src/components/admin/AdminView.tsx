'use client';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlanType, SystemPlan } from '@/lib/types';
import { getMembershipStatus, formatDate, getExpirationDate, getCurrentDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Trash2, Edit, UserPlus, Phone, CheckCircle, Calendar, CreditCard, Search, RefreshCcw, LogOut, Users, X } from 'lucide-react';
import { MemberHistoryModal } from './MemberHistoryModal';
import { AttendanceReport } from './AttendanceReport';
import { useAuthStore } from '@/lib/store';
import { format, addDays, getDay } from 'date-fns';
import { CombinedMember } from '../checkin/MemberCard';
import { toast } from 'sonner';

interface AdminViewProps {
  onLogout?: () => void;
}

export default function AdminView({ onLogout }: AdminViewProps) {
  const [view, setView] = useState<'members' | 'report'>('members');
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [plan, setPlan] = useState<PlanType>('');
  const [costo, setCosto] = useState<string>('');
  const [customDays, setCustomDays] = useState<number | ''>('');
  const [isPromo, setIsPromo] = useState(false);
  const [notes, setNotes] = useState('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [success, setSuccess] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // Identity management
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Force re-render on time travel
  const [timeTick, setTimeTick] = useState(0);
  
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isRegistrationModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isRegistrationModalOpen]);

  React.useEffect(() => {
    // Initialize standard fechaInicio on mount
    const today = format(getCurrentDate(), 'yyyy-MM-dd');
    setFechaInicio(today);

    if (process.env.NODE_ENV !== 'development') return;
    const handleTimeChange = () => {
      setTimeTick(t => t + 1);
      // Also update default date picker date if we aren't editing explicitly
      setFechaInicio(format(getCurrentDate(), 'yyyy-MM-dd'));
    };
    window.addEventListener('time-travel-changed', handleTimeChange);
    return () => window.removeEventListener('time-travel-changed', handleTimeChange);
  }, []);
  
  // Search state for members list
  const [membersSearchTerm, setMembersSearchTerm] = useState('');
  const [membersSort, setMembersSort] = useState('created');
  const [membersSortOrder, setMembersSortOrder] = useState<'asc' | 'desc'>('desc');
  const [membersFilterDate, setMembersFilterDate] = useState<string>('');
  const [membersFilterPlan, setMembersFilterPlan] = useState<string>('all');
  const [membersFilterSocio, setMembersFilterSocio] = useState<string>('all');
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

  const [members, setMembers] = useState<CombinedMember[]>([]);

  const fetchMembers = async () => {
    let query = supabase.from('members').select('*').eq('deleted', false);
    
    if (membersSearchTerm) {
      const lower = membersSearchTerm.toLowerCase();
      // Use standard ilike/like for search
      query = query.or(`nombre.ilike.%${lower}%,telefono.like.%${lower}%`);
    }

    const { data: profiles, error } = await query;
    if (error || !profiles) {
      return;
    }

    let combined: CombinedMember[] = [];
    const memberIds = profiles.map((p: any) => p.memberId);
    
    if (memberIds.length > 0) {
      const { data: plans } = await supabase.from('member_plans')
         .select('*')
         .in('memberId', memberIds)
         .eq('deleted', false)
         .order('fecha_inicio', { ascending: false });
         
      if (plans) {
        for (const p of profiles) {
          const userPlans = plans.filter((plan: any) => plan.memberId === p.memberId);
          if (userPlans.length > 0) {
            combined.push({ member: p, plan: userPlans[0] });
          }
        }
      }
    }
    
    // Filter by date if enabled
    if (membersFilterDate) {
      combined = combined.filter((c) => format(new Date(c.plan.fecha_inicio), 'yyyy-MM-dd') === membersFilterDate);
    }
    
    // Filter by Plan Type
    if (membersFilterPlan && membersFilterPlan !== 'all') {
      combined = combined.filter((c) => c.plan.plan_tipo === membersFilterPlan);
    }
    
    // Filter by Socio Fundador
    if (membersFilterSocio && membersFilterSocio !== 'all') {
      combined = combined.filter((c) => {
        // Assuming Socio Fundador refers to Mensual plans with cost 550
        const isSocio = c.plan.plan_tipo === 'Mensual' && Number(c.plan.costo) === 550;
        return membersFilterSocio === 'yes' ? isSocio : !isSocio;
      });
    }
    
    // Sort overall results based on selected criteria
    combined.sort((a, b) => {
      let result = 0;
      if (membersSort === 'name') {
        result = a.member.nombre.localeCompare(b.member.nombre);
      } else if (membersSort === 'date_expire') {
        result = getExpirationDate(a.plan).getTime() - getExpirationDate(b.plan).getTime();
      } else if (membersSort === 'date_start') {
        result = new Date(a.plan.fecha_inicio).getTime() - new Date(b.plan.fecha_inicio).getTime();
      } else {
        // created: assuming string id is sortable
        result = String(a.plan.id).localeCompare(String(b.plan.id));
      }
      return membersSortOrder === 'asc' ? result : -result;
    });

    setMembers(combined);
  };

  React.useEffect(() => {
    fetchMembers();
  }, [membersSearchTerm, membersSort, membersSortOrder, membersFilterDate, membersFilterPlan, membersFilterSocio, timeTick]);

  React.useEffect(() => {
    const handleSync = () => fetchMembers();
    window.addEventListener('request-sync', handleSync);
    return () => window.removeEventListener('request-sync', handleSync);
  }, [membersSearchTerm, membersSort, membersSortOrder, membersFilterDate, membersFilterPlan, membersFilterSocio]);

  // Name Autocomplete
  React.useEffect(() => {
    if (nombre.length < 2 || editingMemberId) {
      setNameSuggestions([]);
      return;
    }
    
    const timer = setTimeout(async () => {
        try {
            const { data: results } = await supabase
                .from('members')
                .select('*')
                .eq('deleted', false)
                .ilike('nombre', `%${nombre}%`)
                .limit(20);
            
            if (results) {
              const unique = new Map();
              results.forEach((m: any) => {
                  if (m.memberId && !unique.has(m.memberId)) {
                      unique.set(m.memberId, m);
                  }
              });
              setNameSuggestions(Array.from(unique.values()));
              setShowSuggestions(true);
            }
        } catch (e) {
            console.error(e);
        }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nombre, editingMemberId]);

  // Auto-update price suggestion when plan changes
  React.useEffect(() => {
    if (editingPlanId) return; // Don't auto-change price if editing an existing plan
    const selectedPlan = dbPlans.find(p => p.description === plan);
    if (selectedPlan) {
      setCosto(selectedPlan.price.toString());
      setCustomDays(selectedPlan.days_active || '');
    }
  }, [plan, editingPlanId, dbPlans]);

  // Multiply price by customDays for Día plan and read-only
  React.useEffect(() => {
    if (editingPlanId) return;
    if (plan === 'Dia') {
      const selectedPlan = dbPlans.find(p => p.description === plan);
      if (selectedPlan) {
        const days = customDays !== '' && Number(customDays) > 0 ? Number(customDays) : 1;
        setCosto((selectedPlan.price * days).toString());
      }
    }
  }, [customDays, plan, editingPlanId, dbPlans]);

  const calculatedFinalDate = React.useMemo(() => {
    if (!fechaInicio || !plan) return '-';
    const selectedSysPlan = dbPlans.find(p => p.description === plan);
    let days = customDays !== '' ? Number(customDays) : selectedSysPlan?.days_active;
    if (!days) days = 30; // fallback

    try {
      const start = new Date(fechaInicio + 'T12:00:00');
      if (isNaN(start.getTime())) return '-';
      
      if (plan === 'Semanal') {
        days = 6;
      }
      
      let currentDate = start;
      const isShortPlan = days <= 7 || plan === 'Semanal' || plan === 'Día' || plan === 'Dia';

      if (isShortPlan) {
        let validDaysCounted = 0;

        if (getDay(currentDate) !== 0) {
          validDaysCounted = 1;
        }

        while (validDaysCounted < days) {
          currentDate = addDays(currentDate, 1);
          if (getDay(currentDate) !== 0) {
            validDaysCounted++;
          }
        }
      } else {
        // For biweekly/monthly, count natural calendar days
        currentDate = addDays(currentDate, days - 1);
      }
      
      return formatDate(currentDate);
    } catch {
      return '-';
    }
  }, [fechaInicio, customDays, plan, dbPlans]);

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
    setSubmitAttempted(true);
    if (!nombre || !costo || !plan || String(customDays) === '' || Number(customDays) <= 0) {
      toast.error('Por favor completa todos los campos requeridos (*)');
      return;
    }

    try {
      const selectedSysPlan = dbPlans.find(p => p.description === plan);
      const planDays = String(customDays) !== '' ? Number(customDays) : selectedSysPlan?.days_active;
      const planId = selectedSysPlan?.id;

      if (editingMemberId && editingPlanId) {
        // Updating BOTH specific member profile and specific plan
        await supabase.from('members').update({
          nombre,
          telefono,
          updated_at: new Date().toISOString(),
        }).eq('id', editingMemberId);

        await supabase.from('member_plans').update({
          plan_id: planId,
          plan_tipo: plan as any,
          ...(planDays ? { plan_days: planDays } : {}),
          costo: Number(costo),
          is_promo: isPromo,
          notes: notes,
          fecha_inicio: new Date(fechaInicio + 'T12:00:00').toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', editingPlanId);
        
        setEditingMemberId(null);
        setEditingPlanId(null);
      } else {
        // Creating new plan (Renewal or New User)
        const memberId = selectedMemberId || crypto.randomUUID();
        
        if (selectedMemberId) {
           await supabase.from('members')
            .update({ nombre, telefono, updated_at: new Date().toISOString() })
            .eq('memberId', selectedMemberId);
        } else {
           await supabase.from('members').insert({
             memberId,
             nombre,
             telefono,
           });
        }
        
        // Add new purchase record to member_plans
        const { data: insertedPlan, error: insertError } = await supabase.from('member_plans').insert({
          memberId,
          plan_id: planId || null,
          plan_tipo: plan as any,
          ...(planDays ? { plan_days: planDays } : { plan_days: 30 }),
          costo: Number(costo),
          is_promo: isPromo,
          notes: notes,
          fecha_inicio: new Date(fechaInicio + 'T12:00:00').toISOString(),
          registered_by: user?.staffId,
          registered_by_name: user?.nombre,
        }).select().single();
        
        if (autoCheckIn && insertedPlan && !insertError) {
          await supabase.from('attendances').insert({
            memberId,
            member_plan_id: insertedPlan.id,
            fecha_hora: getCurrentDate().toISOString(),
          });
          toast.success('Check-in realizado de inmediato');
        }
      }
      
      setSuccess(true);
      setNombre('');
      setTelefono('');
      setNotes('');
      setIsPromo(false);
      setCustomDays('');
      setAutoCheckIn(true);
      setSubmitAttempted(false);
      setFechaInicio(format(getCurrentDate(), 'yyyy-MM-dd'));
      setEditingMemberId(null);
      setEditingPlanId(null);
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
      
      setIsRegistrationModalOpen(false);
      setTimeout(() => setSuccess(false), 3000);
      window.dispatchEvent(new Event('request-sync'));
    } catch (error) {
      console.error('Error adding/updating member:', error);
    }
  };

  const handleEdit = (combined: CombinedMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMemberId(combined.member.id!);
    setEditingPlanId(combined.plan.id!);
    setSelectedMemberId(combined.member.memberId); // Track ID
    setNombre(combined.member.nombre);
    setTelefono(combined.member.telefono || '');
    setPlan(combined.plan.plan_tipo);
    setCosto(combined.plan.costo.toString());
    setCustomDays(combined.plan.plan_days || '');
    setIsPromo(!!combined.plan.is_promo);
    setNotes(combined.plan.notes || '');
    setSubmitAttempted(false);
    setFechaInicio(format(new Date(combined.plan.fecha_inicio), 'yyyy-MM-dd'));
    setNameSuggestions([]); // Clear suggestions
    setIsRegistrationModalOpen(true);
  };

  const handleRenew = (combined: CombinedMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMemberId(null); // New record
    setEditingPlanId(null);
    setSelectedMemberId(combined.member.memberId); // Reuse Identity
    setNombre(combined.member.nombre);
    setTelefono(combined.member.telefono || '');
    setPlan(combined.plan.plan_tipo);
    setCosto(combined.plan.costo.toString());
    setCustomDays(combined.plan.plan_days || '');
    setIsPromo(!!combined.plan.is_promo);
    setNotes(combined.plan.notes || '');
    setSubmitAttempted(false);
    setFechaInicio(format(getCurrentDate(), 'yyyy-MM-dd'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNameSuggestions([]);
    setIsRegistrationModalOpen(true);
  };

  const handleDelete = async (combined: CombinedMember, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      await supabase.from('members').update({ deleted: true, updated_at: new Date().toISOString() }).eq('id', combined.member.id);
      await supabase.from('member_plans').update({ deleted: true, updated_at: new Date().toISOString() }).eq('id', combined.plan.id);
      window.dispatchEvent(new Event('request-sync'));
    }
  };

  const handleCheckIn = async (combined: CombinedMember, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!combined.member.memberId || !combined.plan.id) return;
    try {
      await supabase.from('attendances').insert({
        memberId: combined.member.memberId,
        member_plan_id: combined.plan.id,
        fecha_hora: getCurrentDate().toISOString(),
      });
      toast.success('Check-in registrado con éxito');
      window.dispatchEvent(new Event('request-sync'));
    } catch (err) {
      console.error('Failed to log attendance', err);
      toast.error('Error al registrar check-in');
    }
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditingPlanId(null);
    setSelectedMemberId(null);
    setNombre('');
    setTelefono('');
    setNotes('');
    setIsPromo(false);
    setCustomDays('');
    setAutoCheckIn(true);
    setSubmitAttempted(false);
    setFechaInicio(format(getCurrentDate(), 'yyyy-MM-dd'));
    if (dbPlans.length > 0) {
      setPlan(dbPlans[0].description);
      setCosto(dbPlans[0].price.toString());
    } else {
      setPlan('');
      setCosto('');
    }
    setNameSuggestions([]);
    setIsRegistrationModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            {view === 'members' ? <Users className="h-8 w-8 text-primary" /> : <Calendar className="h-8 w-8 text-primary" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Administración</h1>
            <p className="text-muted-foreground">
              {view === 'members' ? 'Directorio de miembros y gestión.' : 'Reporte de Accesos y Asistencia.'}
            </p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/10 w-full md:w-auto flex justify-center"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex bg-card/50 border border-white/10 p-1 rounded-xl w-full md:w-auto">
            <button 
                onClick={() => setView('members')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'members' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
            >
                Miembros
            </button>
            <button 
                onClick={() => setView('report')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'report' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
            >
                Asistencias
            </button>
        </div>
        <button 
          onClick={() => {
             handleCancelEdit(); // Clear before opening fresh
             setIsRegistrationModalOpen(true);
          }}
          className="px-5 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 w-full md:w-auto"
        >
          <UserPlus size={18} /> Nuevo Registro
        </button>
      </div>

      {isRegistrationModalOpen && mounted && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
        <div className="w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
          <button 
              onClick={handleCancelEdit} 
              className="absolute top-4 right-4 z-[60] p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white border border-white/10"
              title="Cerrar ventana"
          >
            <X size={20} />
          </button>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10 w-full">
            <Card className="border-0 bg-transparent shadow-none h-full m-0 rounded-none w-full">
          <CardHeader>
             <CardTitle className="text-xl flex justify-between items-center">
               {editingMemberId ? 'Editar Miembro' : selectedMemberId ? 'Renovar Plan' : 'Nuevo Registro'}
               {(editingMemberId || selectedMemberId) && (
                 <button type="button" onClick={handleCancelEdit} className="text-xs text-muted-foreground hover:text-white border px-2 py-1 rounded">
                   Cancelar
                 </button>
               )}
             </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Nombre <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nombre Completo" 
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      if (selectedMemberId && !editingMemberId) {
                        setSelectedMemberId(null);
                      }
                    }}
                    className={`pl-10 h-12 text-base ${submitAttempted && !nombre ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    autoComplete="off"
                    onFocus={() => { if (nameSuggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => {
                        // Delay hiding so clicks on suggestions can register
                        setTimeout(() => setShowSuggestions(false), 200);
                    }}
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
                                <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : status === 'Scheduled' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-400'}`}>
                                    {status === 'Active' ? 'Activo' : status === 'Scheduled' ? 'Agendado' : 'Vencido'}
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
                <label className="text-sm font-medium text-muted-foreground ml-1">Plan <span className="text-red-500">*</span></label>
                <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${submitAttempted && !plan ? 'p-2 border border-red-500/50 rounded-xl bg-red-500/5' : ''}`}>
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
                  <label className="text-xs font-medium text-muted-foreground ml-1">Fecha de Inicio</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="pl-10 h-12 text-base w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Vencimiento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                    <Input 
                      type="text"
                      disabled
                      value={calculatedFinalDate}
                      className="pl-10 h-12 text-base w-full bg-muted/30 text-muted-foreground font-medium opacity-80"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Precio <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">C$</span>
                    <Input 
                      placeholder="0" 
                      value={costo}
                      disabled={true}
                      onChange={(e) => setCosto(e.target.value)}
                      type="number"
                      className={`pl-8 h-12 font-mono text-base bg-muted/30 opacity-80 cursor-not-allowed ${submitAttempted && !costo ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Días activos <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="30" 
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value === '' ? '' : Number(e.target.value))}
                    type="number"
                    min="1"
                    disabled={plan !== 'Dia'}
                    className={`h-12 font-mono text-base text-center ${submitAttempted && (String(customDays) === '' || Number(customDays) <= 0) ? 'border-red-500 ring-1 ring-red-500' : ''} ${plan !== 'Dia' ? 'opacity-50 cursor-not-allowed bg-muted/30' : ''}`}
                  />
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

              {!editingMemberId && (
              <div className="flex items-center gap-2 pt-2 pb-2 pl-1">
                <input 
                  type="checkbox" 
                  id="autoCheckIn" 
                  checked={autoCheckIn}
                  onChange={(e) => setAutoCheckIn(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                />
                <label htmlFor="autoCheckIn" className="text-sm font-medium text-muted-foreground select-none cursor-pointer">
                  Hacer check-in automático
                </label>
              </div>
              )}

              <div className="flex gap-4">
                {(editingMemberId || selectedMemberId) && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="w-1/3 h-14 text-lg rounded-xl border-white/10 hover:bg-white/5"
                  >
                    Cancelar
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className={`${(editingMemberId || selectedMemberId) ? 'w-2/3' : 'w-full'} h-14 text-lg rounded-xl shadow-lg shadow-primary/25 ${editingMemberId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                >
                  {success ? (
                    <span className="flex items-center animate-pulse">
                      <CheckCircle className="mr-2 h-5 w-5" /> {editingMemberId ? 'Actualizado' : 'Guardado'}
                    </span>
                  ) : (
                    editingMemberId ? 'Actualizar Miembro' : selectedMemberId ? 'Renovar Plan' : 'Registrar'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
            </Card>
          </div>
        </div>
      </div>,
      document.body
      )}

      {view === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold ml-1 flex items-center gap-2">
              Miembros Recientes
              <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                {members.length}
              </span>
            </h2>
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col gap-3">
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
            {/* Sort and Filters Row */}
            <div className="flex flex-row flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1 bg-card/50 p-1 rounded-md border border-white/10">
                <input 
                  type="date"
                  value={membersFilterDate}
                  onChange={(e) => setMembersFilterDate(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-0 text-white w-[125px]"
                  title="Filtrar por fecha de registro"
                />
                {membersFilterDate && (
                  <button onClick={() => setMembersFilterDate('')} className="text-muted-foreground hover:text-white px-1 font-bold text-xs" title="Limpiar fecha">
                    ✕
                  </button>
                )}
              </div>
              <select
                value={membersFilterPlan}
                onChange={(e) => setMembersFilterPlan(e.target.value)}
                className="h-9 rounded-md border border-white/10 bg-card/50 px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                title="Filtrar por plan"
              >
                <option value="all" className="bg-neutral-900">Todos los planes</option>
                {dbPlans.map(sysPlan => (
                   <option key={sysPlan.id} value={sysPlan.description} className="bg-neutral-900">{sysPlan.description}</option>
                ))}
              </select>

              <select
                value={membersFilterSocio}
                onChange={(e) => setMembersFilterSocio(e.target.value)}
                className="h-9 rounded-md border border-white/10 bg-card/50 px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                title="Filtrar por Socio Fundador"
              >
                <option value="all" className="bg-neutral-900">Todos los Socios</option>
                <option value="yes" className="bg-neutral-900">Solo Fundadores</option>
                <option value="no" className="bg-neutral-900">No Fundadores</option>
              </select>

              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap ml-auto">Ordenar:</span>
              <select
                value={membersSort}
                onChange={(e) => setMembersSort(e.target.value)}
                className="h-9 flex-1 rounded-md border border-white/10 bg-card/50 px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
              >
                <option value="created" className="bg-neutral-900">Fecha de Creación</option>
                <option value="name" className="bg-neutral-900">Nombre</option>
                <option value="date_expire" className="bg-neutral-900">Vencimiento</option>
                <option value="date_start" className="bg-neutral-900">Inicio de Plan</option>
              </select>
              <button
                type="button"
                onClick={() => setMembersSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center justify-center p-2 rounded-md border border-white/10 bg-card/50 hover:bg-card/80 transition-colors text-white h-9 px-3 text-sm font-medium"
                title={membersSortOrder === 'asc' ? 'Ascendente (A-Z / Más Antiguos Primero)' : 'Descendente (Z-A / Más Nuevos Primero)'}
              >
                {membersSortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {members?.map((combined) => {
              const status = getMembershipStatus(combined.plan);
              const isExpired = status === 'Expired';
              const expirationDate = getExpirationDate(combined.plan);

              return (
                  <Card 
                  key={combined.plan.id || combined.member.id} 
                  className={`border-white/5 bg-card/60 transition-all cursor-pointer hover:bg-card/80 hover:border-primary/30 ${editingMemberId === combined.member.id ? 'border-primary ring-2 ring-primary/50' : ''}`}
                  onClick={() => setSelectedHistoryMember(combined.member)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{combined.member.nombre}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {combined.member.telefono && <span className="flex items-center"><Phone size={12} className="mr-1"/> {combined.member.telefono}</span>}
                        <span className="flex items-center text-xs bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          {combined.plan.plan_tipo}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground flex items-center gap-1 w-16">
                            <Calendar size={10} /> Inicio:
                          </span>
                          <span className="font-medium text-white/90">
                            {formatDate(combined.plan.fecha_inicio)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground flex items-center gap-1 w-16">
                            <Calendar size={10} /> Expira:
                          </span>
                          <span className={`font-medium ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatDate(expirationDate)}
                          </span>
                        </div>
                      </div>
                      
                      {combined.plan.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/20 pl-2">
                          "{combined.plan.notes}"
                        </p>
                      )}
                      
                      {combined.plan.registered_by_name && (
                         <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 opacity-70">
                            <Users size={10} /> Reg: {combined.plan.registered_by_name}
                         </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={`text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                        isExpired ? 'bg-red-500/10 text-red-400' : status === 'Scheduled' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isExpired ? 'Vencido' : status === 'Scheduled' ? 'Agendado' : 'Activo'}
                      </div>
                      <div className="text-sm font-mono opacity-70">
                        C$ {combined.plan.costo}
                        {combined.plan.is_promo && <span className="text-emerald-400 ml-1 text-xs" title="Promo Aplicada">★</span>}
                      </div>
                      
                    </div>
                  </div>
                  
                  {/* Action Buttons Row */}
                  <div className="px-4 pb-4 flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
                      {!isExpired ? (
                        <div className="flex gap-2 flex-wrap justify-end">
                          {status !== 'Scheduled' && (
                            <button 
                               onClick={(e) => handleCheckIn(combined, e)}
                               className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                               title="Check-in"
                            >
                              <CheckCircle size={14} /> Check-in
                            </button>
                          )}
                          <button 
                             onClick={(e) => handleRenew(combined, e)}
                             className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                             title="Agregar Plan"
                          >
                            <RefreshCcw size={14} /> Renovar
                          </button>
                          <button 
                             onClick={(e) => handleEdit(combined, e)}
                             className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                             title="Editar"
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button 
                             onClick={(e) => handleDelete(combined, e)}
                             className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                             title="Eliminar"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button 
                             onClick={(e) => handleRenew(combined, e)}
                             className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors z-10 flex items-center justify-center gap-1 text-xs font-bold w-full"
                             title="Renovar Suscripción"
                          >
                            <RefreshCcw size={14} /> Renovar Suscripción
                          </button>
                        </div>
                      )}
                  </div>
                </Card>
              );
            })}
            {members?.length === 0 && (
              <div className="text-center py-10 opacity-50">No hay miembros registrados.</div>
            )}
          </div>
        </div>
      )}

      {view === 'report' && (
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
