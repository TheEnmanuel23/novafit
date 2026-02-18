
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
    }, [isOnline]);

    return null;
};
