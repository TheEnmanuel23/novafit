
'use client';
import AdminView from '@/components/admin/AdminView';
import React, { useState } from 'react';
import { LoginView } from '@/components/admin/LoginView';
import { Staff } from '@/lib/types';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<Staff | null>(null);

    const handleLogin = (loggedInUser: Staff) => {
        setUser(loggedInUser);
        setIsAuthenticated(true);
    };

    if (!isAuthenticated) {
        return <LoginView onLogin={handleLogin} />;
    }

    return (
        <AdminView onLogout={() => setIsAuthenticated(false)} />
    );
}
