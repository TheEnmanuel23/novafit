
'use client';
import { useEffect } from 'react';
import { syncData } from '@/lib/sync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const SyncWorker = () => {
    const isOnline = useOnlineStatus();

    useEffect(() => {
        if (isOnline) {
            console.log('Online detected. Auto-syncing...');
            syncData().catch(console.error);
        }

        const handleSyncRequest = () => {
            if (isOnline) {
                console.log('Local mutation detected. Background sync triggered...');
                syncData().catch(console.error);
            }
        };

        window.addEventListener('request-sync', handleSyncRequest);

        return () => window.removeEventListener('request-sync', handleSyncRequest);
    }, [isOnline]);

    return null;
};
