
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { syncData } from '@/lib/sync';
import { Button } from '@/components/ui/Button';
import { CloudUpload, Download, Wifi, WifiOff, RefreshCw } from 'lucide-react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const SyncButton = () => {
  const [loading, setLoading] = useState(false);
  const isOnline = useOnlineStatus();

  const handleSync = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isOnline) {
        const debugAtt = await db.attendances.toArray();
        console.log("ALL LOCAL ATTENDANCES:", debugAtt);

        await syncData();
        const members = await db.members.toArray();
        const attendances = await db.attendances.toArray();
        alert(`Sincronización Exitosa con Supabase.\n${members.length} miembros.\n${attendances.length} asistencias.`);
      } else {
        // Force download (Manual only)
        const members = await db.members.toArray();
        const attendances = await db.attendances.toArray();
        const payload = JSON.stringify({
          members,
          attendances,
          exportedAt: new Date().toISOString(),
        }, null, 2);

        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nova-fit-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error('Sync error:', e);
      alert(`Error en la sincronización: ${e.message}\nRevisa la consola.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={loading}
      className={`gap-2 border-white/10 hover:bg-white/5 transition-all ${loading ? 'opacity-80' : ''}`}
      size="sm"
    >
      {loading ? (
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
      ) : isOnline ? (
        <CloudUpload className="h-5 w-5 text-emerald-400" />
      ) : (
        <Download className="h-5 w-5 text-amber-400" />
      )}
      
      <span className="hidden md:inline font-medium">
        {loading ? 'Sincronizando...' : isOnline ? 'Sincronizar' : 'Exportar (Offline)'}
      </span>
      
      {isOnline ? (
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" title="Online" />
      ) : (
        <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" title="Offline" />
      )}
    </Button>
  );
};
