'use client';
import React, { useState } from 'react';
import { PlanType, SystemPlan } from '@/lib/types';
import { getExpirationDate, getCurrentDate, getMembershipStatus, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Trash2, Edit, UserPlus, Search, RefreshCcw, LogOut, Users, Calendar, CheckCircle, Phone, PlusCircle, Filter } from 'lucide-react';
import { MemberHistoryModal } from './MemberHistoryModal';
import { MemberFormModal, InitialMemberData } from './MemberFormModal';
import { AttendanceReport } from './AttendanceReport';
import { useAuthStore } from '@/lib/store';
import { format } from 'date-fns';
import { CombinedMember } from '../checkin/MemberCard';
import { toast } from 'sonner';


interface FilterOption { label: string; value: string; }
interface FilterSelectProps {
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
}
function FilterSelect({ value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  const selected = options.find(o => o.value === value);

  // Use layout effect or normal effect but recalculate carefully
  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Use purely viewport relative coordinates with position: fixed
      // Avoid adding scrollY/scrollX when using position: fixed
      setPos({ 
        top: r.bottom + 4, 
        left: r.left, 
        width: Math.max(r.width, 160) 
      });
    }
  };

  const openMenu = () => {
    updatePos();
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    updatePos(); // Recalculate if something shifts
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false); };
    const handleScroll = () => updatePos();
    
    document.addEventListener('mousedown', close);
    // document.addEventListener('scroll', handleScroll, true); // Update pos on scroll while open
    return () => {
      document.removeEventListener('mousedown', close);
      // document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openMenu()}
        className="h-8 flex items-center justify-between gap-1.5 rounded-lg border border-white/10 bg-card/60 px-2.5 text-xs text-white whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-primary/50 hover:bg-white/5 transition-colors"
      >
        <span>{selected?.label ?? value}</span>
        <svg className="h-3 w-3 text-muted-foreground opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div
          ref={ref}
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 99999 }}
          className="bg-neutral-900 border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] py-1.5 overflow-hidden ring-1 ring-white/5"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                opt.value === value 
                  ? 'text-primary font-bold bg-primary/10' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {opt.label}
              {opt.value === value && (
                <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

interface AdminViewProps {
  onLogout?: () => void;
}

export default function AdminView({ onLogout }: AdminViewProps) {
  const [view, setView] = useState<'members' | 'report'>('members');
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [initialData, setInitialData] = useState<InitialMemberData | null>(null);
  
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
  const [membersSort, setMembersSort] = useState('created');
  const [membersSortOrder, setMembersSortOrder] = useState<'asc' | 'desc'>('desc');
  const [membersFilterDateFrom, setMembersFilterDateFrom] = useState<string>('');
  const [membersFilterDateTo, setMembersFilterDateTo] = useState<string>('');
  const [membersFilterDatePreset, setMembersFilterDatePreset] = useState<string>('all');
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
    
    // Filter by date range if enabled
    if (membersFilterDateFrom || membersFilterDateTo) {
      const from = membersFilterDateFrom ? new Date(membersFilterDateFrom + 'T00:00:00') : null;
      const to = membersFilterDateTo ? new Date(membersFilterDateTo + 'T23:59:59') : null;
      combined = combined.filter((c) => {
        const d = new Date(c.plan.fecha_inicio);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
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
  }, [membersSearchTerm, membersSort, membersSortOrder, membersFilterDateFrom, membersFilterDateTo, membersFilterPlan, membersFilterSocio, timeTick]);

  React.useEffect(() => {
    const handleSync = () => fetchMembers();
    window.addEventListener('request-sync', handleSync);
    return () => window.removeEventListener('request-sync', handleSync);
  }, [membersSearchTerm, membersSort, membersSortOrder, membersFilterDateFrom, membersFilterDateTo, membersFilterPlan, membersFilterSocio]);

  const handleEdit = (combined: CombinedMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setInitialData({
      editingMemberId: combined.member.id!,
      editingPlanId: combined.plan.id!,
      selectedMemberId: combined.member.memberId,
      nombre: combined.member.nombre,
      telefono: combined.member.telefono || '',
      plan: combined.plan.plan_tipo as any,
      costo: combined.plan.costo.toString(),
      customDays: combined.plan.plan_days || '',
      isPromo: !!combined.plan.is_promo,
      notes: combined.plan.notes || '',
      fechaInicio: format(new Date(combined.plan.fecha_inicio), 'yyyy-MM-dd'),
    });
    setIsRegistrationModalOpen(true);
  };

  const handleRenew = (combined: CombinedMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setInitialData({
      editingMemberId: null,
      editingPlanId: null,
      selectedMemberId: combined.member.memberId,
      nombre: combined.member.nombre,
      telefono: combined.member.telefono || '',
      plan: combined.plan.plan_tipo as any,
      costo: combined.plan.costo.toString(),
      customDays: combined.plan.plan_days || '',
      isPromo: !!combined.plan.is_promo,
      notes: combined.plan.notes || '',
      fechaInicio: format(getCurrentDate(), 'yyyy-MM-dd'),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleNewRegistration = () => {
    setInitialData(null);
    setIsRegistrationModalOpen(true);
  };

  const handleCloseModal = () => {
    setInitialData(null);
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
          onClick={handleNewRegistration}
          className="px-5 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 w-full md:w-auto"
        >
          <UserPlus size={18} /> Nuevo Registro
        </button>
      </div>

      <MemberFormModal 
        isOpen={isRegistrationModalOpen}
        onClose={handleCloseModal}
        onSuccess={() => window.dispatchEvent(new Event('request-sync'))}
        dbPlans={dbPlans}
        initialData={initialData}
      />



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
          
          {/* Filters Card */}
          <div className="bg-card/40 border border-white/8 rounded-2xl">

            {/* Search Row */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={membersSearchTerm}
                  onChange={(e) => setMembersSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-transparent border-transparent focus:border-primary/50 text-sm"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Filtros</span>
              <FilterSelect
                value={membersFilterDatePreset}
                options={[
                  { value: 'all',    label: '📅 Todas las fechas' },
                  { value: 'today',  label: '📅 Hoy' },
                  { value: 'week',   label: '📅 Últimos 7 días' },
                  { value: 'month',  label: '📅 Este mes' },
                  { value: 'custom', label: '📅 Personalizado…' },
                ]}
                onChange={(val) => {
                  setMembersFilterDatePreset(val);
                  const today = format(getCurrentDate(), 'yyyy-MM-dd');
                  if (val === 'all') { setMembersFilterDateFrom(''); setMembersFilterDateTo(''); }
                  else if (val === 'today') { setMembersFilterDateFrom(today); setMembersFilterDateTo(today); }
                  else if (val === 'week') {
                    const from = format(new Date(new Date(getCurrentDate()).setDate(getCurrentDate().getDate() - 7)), 'yyyy-MM-dd');
                    setMembersFilterDateFrom(from); setMembersFilterDateTo(today);
                  } else if (val === 'month') {
                    const from = format(new Date(new Date(getCurrentDate()).setDate(1)), 'yyyy-MM-dd');
                    setMembersFilterDateFrom(from); setMembersFilterDateTo(today);
                  }
                }}
              />
              <FilterSelect
                value={membersFilterPlan}
                options={[
                  { value: 'all', label: 'Todos los planes' },
                  ...dbPlans.map(p => ({ value: p.description, label: p.description })),
                ]}
                onChange={setMembersFilterPlan}
              />
              <FilterSelect
                value={membersFilterSocio}
                options={[
                  { value: 'all', label: 'Todos los socios' },
                  { value: 'yes', label: 'Solo Fundadores' },
                  { value: 'no',  label: 'No Fundadores' },
                ]}
                onChange={setMembersFilterSocio}
              />
            </div>

            {/* Sort Row */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Ordenar</span>
              <FilterSelect
                value={membersSort}
                options={[
                  { value: 'created',     label: 'Fecha de Creación' },
                  { value: 'name',        label: 'Nombre' },
                  { value: 'date_expire', label: 'Vencimiento' },
                  { value: 'date_start',  label: 'Inicio de Plan' },
                ]}
                onChange={setMembersSort}
              />
              <button
                type="button"
                onClick={() => setMembersSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="h-8 px-3 rounded-lg border border-white/10 bg-card/60 hover:bg-card/90 transition-colors text-white text-xs font-medium whitespace-nowrap"
              >
                {membersSortOrder === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
              </button>
            </div>

            {/* Custom date range row — only shown when preset is custom */}
            {membersFilterDatePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/10">
                <Calendar className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rango:</span>
                <div className="flex items-center gap-1.5 bg-card/60 border border-white/10 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">Desde</span>
                  <input
                    type="date"
                    value={membersFilterDateFrom}
                    onChange={(e) => setMembersFilterDateFrom(e.target.value)}
                    className="bg-transparent border-none text-xs focus:outline-none text-white w-[115px]"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-card/60 border border-white/10 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">Hasta</span>
                  <input
                    type="date"
                    value={membersFilterDateTo}
                    onChange={(e) => setMembersFilterDateTo(e.target.value)}
                    className="bg-transparent border-none text-xs focus:outline-none text-white w-[115px]"
                  />
                </div>
                {(membersFilterDateFrom || membersFilterDateTo) && (
                  <button
                    onClick={() => { setMembersFilterDateFrom(''); setMembersFilterDateTo(''); setMembersFilterDatePreset('all'); }}
                    className="text-xs text-muted-foreground hover:text-white transition-colors underline underline-offset-2"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}

          </div>

          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {members?.map((combined) => {
              const status = getMembershipStatus(combined.plan);
              const isExpired = status === 'Expired';
              const expirationDate = getExpirationDate(combined.plan);

              return (
                  <Card 
                  key={combined.plan.id || combined.member.id} 
                  className={`border-white/5 bg-card/60 transition-all cursor-pointer hover:bg-card/80 hover:border-primary/30 ${initialData?.editingMemberId === combined.member.id ? 'border-primary ring-2 ring-primary/50' : ''}`}
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
                             className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors z-10 flex items-center gap-1 text-xs font-bold"
                             title="Agregar otro plan al miembro"
                          >
                            <PlusCircle size={14} /> Agregar Plan
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
