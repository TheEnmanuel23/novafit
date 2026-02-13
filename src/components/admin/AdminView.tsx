
'use client';
import React, { useState } from 'react';
import { db } from '@/lib/db';
import { PlanType } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMembershipStatus, formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Trash2, Edit, UserPlus, Phone, CheckCircle, Calendar, CreditCard, Search, RefreshCcw } from 'lucide-react';
import { MemberHistoryModal } from './MemberHistoryModal';

export default function AdminView() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [plan, setPlan] = useState<PlanType>('Mensual');
  const [costo, setCosto] = useState<string>('500'); // Default for Mensual
  const [isPromo, setIsPromo] = useState(false);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Search state for members list
  const [membersSearchTerm, setMembersSearchTerm] = useState('');
  const [selectedHistoryMember, setSelectedHistoryMember] = useState<any>(null);

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
    
    // Deduplicate: Keep only the latest record for each unique member (Name only, to handle phone updates)
    const uniqueMembers = new Map();
    rawResults.forEach(member => {
      const key = member.nombre.toLowerCase().trim();
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, member);
      }
    });
    
    return Array.from(uniqueMembers.values());
  }, [membersSearchTerm]);

  // Auto-update price suggestion when plan changes
  React.useEffect(() => {
    if (editingId) return; // Don't auto-change price if editing
    if (plan === 'Mensual') setCosto('500');
    if (plan === 'Quincenal') setCosto('300');
    if (plan === 'Día') setCosto('50');
  }, [plan, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono || !costo) return;

    try {
      if (editingId) {
        await db.members.update(editingId, {
          nombre,
          telefono,
          plan_tipo: plan,
          costo: Number(costo),
          is_promo: isPromo,
          notes: notes,
        });
        setEditingId(null);
      } else {
        await db.members.add({
          nombre,
          telefono,
          plan_tipo: plan,
          costo: Number(costo),
          is_promo: isPromo,
          notes: notes,
          fecha_inicio: new Date(),
        });
      }
      
      setSuccess(true);
      setNombre('');
      setTelefono('');
      setNotes('');
      setIsPromo(false);
      setEditingId(null);
      // Reset plan default
      setPlan('Mensual');
      setCosto('500');
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error adding/updating member:', error);
    }
  };

  const handleEdit = (member: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(member.id);
    setNombre(member.nombre);
    setTelefono(member.telefono);
    setPlan(member.plan_tipo);
    setCosto(member.costo.toString());
    setIsPromo(!!member.is_promo);
    setNotes(member.notes || '');
  };

  const handleRenew = (member: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setNombre(member.nombre);
    setTelefono(member.telefono);
    setPlan(member.plan_tipo);
    setCosto(member.costo.toString());
    setIsPromo(!!member.is_promo);
    setNotes(member.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      await db.members.update(id, { deleted: true });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNombre('');
    setTelefono('');
    setNotes('');
    setIsPromo(false);
    setPlan('Mensual');
    setCosto('500');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-primary/20 rounded-xl">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Administración</h1>
          <p className="text-muted-foreground">Registro y control de miembros.</p>
        </div>
      </div>

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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Teléfono</label>
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
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlan('Mensual')}
                    className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all ${
                      plan === 'Mensual' 
                        ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20' 
                        : 'border-muted bg-card hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Calendar className="h-8 w-8 mb-2" />
                    <span className="font-bold text-sm sm:text-base">Mensual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan('Quincenal')}
                    className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all ${
                      plan === 'Quincenal' 
                        ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20' 
                        : 'border-muted bg-card hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <CreditCard className="h-8 w-8 mb-2" />
                    <span className="font-bold text-sm sm:text-base">Quincenal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan('Día')}
                    className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all ${
                      plan === 'Día' 
                        ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20' 
                        : 'border-muted bg-card hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <CheckCircle className="h-8 w-8 mb-2" />
                    <span className="font-bold text-sm sm:text-base">Día</span>
                  </button>
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
                disabled={!nombre || !telefono || !costo}
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
              // We need getExpirationDate imported from utils
              // Assuming I imported it, but wait, I didn't import it in the top block of this replacement.
              // I MUST import getExpirationDate.
              // I will use a simple inline calculation or assume I added it to imports.
              // I added it in the top block of this replacement content.
              // Wait, I see "import { Trash2... }". I missed getExpirationDate import.
              // I will inject the calculation inline to be safe or fix the import.
              // Let's fix the import in the replacement content.
              
              const expirationDate = new Date(member.fecha_inicio);
              let daysActive = 30;
              if (member.plan_tipo === 'Quincenal') daysActive = 15;
              if (member.plan_tipo === 'Día') daysActive = 1;
              expirationDate.setDate(expirationDate.getDate() + daysActive);

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
                        <span className="flex items-center"><Phone size={12} className="mr-1"/> {member.telefono}</span>
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
      
      {/* History Modal */}
      <MemberHistoryModal 
        member={selectedHistoryMember} 
        onClose={() => setSelectedHistoryMember(null)} 
      />
    </div>
  );
}
