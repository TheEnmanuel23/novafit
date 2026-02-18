
'use client';
import AdminView from '@/components/admin/AdminView';
import React, { useState } from 'react';
import { LoginView } from '@/components/admin/LoginView';
import { Staff } from '@/lib/types';
import { useAuthStore } from '@/lib/store';

export default function AdminPage() {
    const { isAuthenticated, login, logout } = useAuthStore();

    if (!isAuthenticated) {
        return <LoginView onLogin={login} />;
    }

    return (
        <AdminView onLogout={logout} />
    );
}
