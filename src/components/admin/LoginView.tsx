
'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, User } from 'lucide-react';
import { Staff } from '@/lib/types';

interface LoginViewProps {
    onLogin: (user: Staff) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data: users, error } = await supabase
                .from('staff')
                .select('*')
                .eq('username', username)
                .eq('deleted', false)
                .limit(1);

            if (error) throw error;
            const user = users?.[0];

            if (user && user.password === password) {
                onLogin(user as Staff);
            } else {
                setError('Credenciales inválidas o usuario no encontrado.');
            }
        } catch (err) {
            console.error(err);
            setError('Error al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <div className="w-full max-w-md space-y-8 bg-card/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Admin Login</h1>
                    <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Usuario</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="usuario" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 h-12 text-base bg-black/20"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="password"
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 h-12 text-base bg-black/20"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={!username || !password || loading}
                        className="w-full h-12 text-lg rounded-xl"
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
