
import AdminView from '@/components/admin/AdminView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - Nova Fit',
  description: 'Gestión de miembros - Agregar nuevos socios',
};

export default function AdminPage() {
  return (
    <>
      <AdminView />
    </>
  );
}
