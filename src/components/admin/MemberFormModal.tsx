'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PlanType, SystemPlan } from '@/lib/types';
import { formatDate, getExpirationDate, getCurrentDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { UserPlus, Phone, CheckCircle, Calendar, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { format, addDays, getDay } from 'date-fns';
import { toast } from 'sonner';
import { useCreateMember } from '@/hooks/useCreateMember';
import { useEditMember } from '@/hooks/useEditMember';

export interface InitialMemberData {
  editingMemberId: number | string | null;
  editingPlanId: string | null;
  selectedMemberId: string | null;
  nombre: string;
  telefono: string;
  plan: PlanType;
  costo: string;
  customDays: number | '';
  isPromo: boolean;
  notes: string;
  fechaInicio: string;
}

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dbPlans: SystemPlan[];
  initialData?: InitialMemberData | null;
}

export function MemberFormModal({ isOpen, onClose, onSuccess, dbPlans, initialData }: MemberFormModalProps) {
  const [mounted, setMounted] = useState(false);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [plan, setPlan] = useState<PlanType>('');
  const [costo, setCosto] = useState<string>('');
  const [customDays, setCustomDays] = useState<number | ''>('');
  const [isPromo, setIsPromo] = useState(false);
  const [notes, setNotes] = useState('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  
  // UX State
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Identity and Editing tracking
  const [editingMemberId, setEditingMemberId] = useState<number | string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Used to skip auto-update effects during initial form population
  const isInitializingRef = React.useRef(false);
  
  const user = useAuthStore(state => state.user);
  
  const { createMember } = useCreateMember();
  const { editMember } = useEditMember();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      resetForm();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        isInitializingRef.current = true;
        setEditingMemberId(initialData.editingMemberId);
        setEditingPlanId(initialData.editingPlanId);
        setSelectedMemberId(initialData.selectedMemberId);
        setNombre(initialData.nombre);
        setTelefono(initialData.telefono || '');
        setPlan(initialData.plan);
        setCosto(initialData.costo);
        setCustomDays(initialData.customDays);
        setIsPromo(initialData.isPromo);
        setNotes(initialData.notes || '');
        setFechaInicio(initialData.fechaInicio);
        setAutoCheckIn(true);
        // Allow effects to settle before accepting plan changes
        setTimeout(() => { isInitializingRef.current = false; }, 0);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);


  // Date Logic
  const calculatedFinalDate = useMemo(() => {
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

  // Auto-update price and days when plan changes (works for new, edit and renew modes)
  useEffect(() => {
    if (!isOpen || isInitializingRef.current) return;
    const selectedPlan = dbPlans.find(p => p.description === plan);
    if (selectedPlan) {
      setCosto(selectedPlan.price.toString());
      setCustomDays(selectedPlan.days_active || '');
    }
  }, [plan, dbPlans, isOpen]);

  // Multiply price by customDays for Día plan
  useEffect(() => {
    if (!isOpen || isInitializingRef.current) return;
    if (plan === 'Dia') {
      const selectedPlan = dbPlans.find(p => p.description === plan);
      if (selectedPlan) {
        const days = customDays !== '' && Number(customDays) > 0 ? Number(customDays) : 1;
        setCosto((selectedPlan.price * days).toString());
      }
    }
  }, [customDays, plan, dbPlans, isOpen]);


  const resetForm = () => {
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
  };

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
        // Update
        await editMember({
          editingMemberId,
          editingPlanId,
          nombre,
          telefono,
          planId,
          planTipo: plan,
          planDays: planDays as number | undefined,
          costo: Number(costo),
          isPromo,
          notes,
          fechaInicio
        });
      } else {
        // Create / Renew
        await createMember({
          selectedMemberId,
          nombre,
          telefono,
          planId,
          planTipo: plan,
          planDays: planDays as number | undefined,
          costo: Number(costo),
          isPromo,
          notes,
          fechaInicio,
          staffId: user?.staffId,
          staffName: user?.nombre,
          autoCheckIn
        });
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        resetForm();
        onSuccess();
      }, 800);
      
    } catch (error) {
      console.error('Error adding/updating member:', error);
      toast.error('Error al guardar registro');
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-[60] p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white border border-white/10"
            title="Cerrar ventana"
        >
          <X size={20} />
        </button>
        
        <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10 w-full">
          <Card className="border-0 bg-transparent shadow-none h-full m-0 w-full rounded-none">
            <CardHeader>
               <CardTitle className="text-xl flex justify-between items-center pr-10">
                 {editingMemberId ? 'Editar Miembro' : selectedMemberId ? 'Renovar Plan' : 'Nuevo Registro'}
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
                      onChange={(e) => setNombre(e.target.value)}
                      className={`pl-10 h-12 text-base ${submitAttempted && !nombre ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      autoComplete="off"
                    />
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
                  <Button 
                    type="submit" 
                    className={`w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/25 ${editingMemberId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                  >
                    {success ? (
                      <span className="flex items-center animate-pulse">
                        <CheckCircle className="mr-2 h-5 w-5" /> {editingMemberId ? 'Actualizado' : 'Guardado'}
                      </span>
                    ) : (
                      editingMemberId ? 'Actualizar Miembro' : 'Guardar y Finalizar'
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
  );
}
