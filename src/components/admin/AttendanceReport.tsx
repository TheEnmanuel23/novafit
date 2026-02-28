
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Member, Attendance } from '@/lib/types';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Search, Filter, Download, User } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export const AttendanceReport = () => {
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  
  const [logs, setLogs] = useState<(Attendance & { memberName: string; planName: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
        // Parse dates as Local Time to avoid UTC offsets shifting the day
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);

        const [ey, em, ed] = endDate.split('-').map(Number);
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

        // Get logs in range
        const atts = await db.attendances
            .where('fecha_hora')
            .between(start, end)
            .reverse()
            .toArray();

        // Fetch all members and plans to avoid anyOf lookup issues on undefined arrays
        const allMembers = await db.members.toArray();
        const memberMap = new Map(allMembers.map(m => [m.memberId, m]));
        const legacyMemberMap = new Map(allMembers.map(m => [m.id!, m]));

        const allPlans = await db.member_plans.toArray();
        const planMap = new Map(allPlans.map(p => [p.sync_id, p]));

        const enriched = atts.map(att => {
            const member = att.memberId ? memberMap.get(att.memberId) : legacyMemberMap.get(att.miembroId);
            const plan = att.member_plan_id ? planMap.get(att.member_plan_id) : legacyMemberMap.get(att.miembroId);
            
            return {
                ...att,
                memberName: member?.nombre || 'Desconocido',
                planName: plan?.plan_tipo || 'N/A',
            };
        });

        setLogs(enriched);
    } catch (e) {
        console.error("Error fetching logs", e);
    } finally {
        setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
      log.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filters */}
      <Card className="border-primary/20 bg-card/40 backdrop-blur-xl">
        <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Filter className="h-5 w-5 text-primary" />
             Filtros de Reporte
           </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Desde</label>
                    <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-card/50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                    <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-card/50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Buscar Miembro</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-card/50 pl-10"
                        />
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-white/5 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Historial de Accesos ({filteredLogs.length})</CardTitle>
            {/* Export button placeholder */}
            <Button variant="outline" size="sm" disabled>
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-muted-foreground font-medium">
                        <tr>
                            <th className="p-4">Fecha y Hora</th>
                            <th className="p-4">Miembro</th>
                            <th className="p-4">Plan Usado</th>
                            {/* <th className="p-4">ID</th> */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No hay registros en este rango.</td></tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-emerald-400">
                                        {format(log.fecha_hora, "dd MMM yyyy, hh:mm a", { locale: es })}
                                    </td>
                                    <td className="p-4 font-bold flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                                            {log.memberName.charAt(0)}
                                        </div>
                                        {log.memberName}
                                    </td>
                                    <td className="p-4 opacity-70">
                                        {log.planName}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
