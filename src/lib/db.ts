
// src/lib/db.ts
import Dexie, { Table } from 'dexie';
import { Member, Attendance } from './types';

class NovaFitDatabase extends Dexie {
  members!: Table<Member, number>;
  attendances!: Table<Attendance, number>;


  constructor() {
    super('NovaFitDB');
    this.version(3).stores({
      members: '++id, nombre, telefono, plan_tipo, fecha_inicio, costo, is_promo', // Added index for promo
      attendances: '++id, miembroId, fecha_hora',
    });
  }
}

export const db = new NovaFitDatabase();

// Helper to seed data if empty (useful for demo)
export async function seedDatabase() {
  const count = await db.members.count();
  if (count === 0) {
    const defaultMembers: Member[] = [
      { nombre: 'Enmanuel Jarquin', telefono: '5551234567', plan_tipo: 'Mensual', costo: 500, is_promo: false, notes: 'Cliente frecuente', fecha_inicio: new Date() },
      { nombre: 'Angelica Perez', telefono: '5559876543', plan_tipo: 'Quincenal', costo: 300, is_promo: true, notes: 'Promo bienvenida', fecha_inicio: new Date(new Date().setDate(new Date().getDate() - 20)) }, // Expired
      { nombre: 'Juan Perez', telefono: '5551112222', plan_tipo: 'Mensual', costo: 500, is_promo: false, fecha_inicio: new Date(new Date().setDate(new Date().getDate() - 10)) },
      { nombre: 'Pedro Visita', telefono: '5553334444', plan_tipo: 'Día', costo: 50, is_promo: false, fecha_inicio: new Date() }, // One day pass
    ];
    await db.members.bulkAdd(defaultMembers);
    console.log('Database seeded with default members (v3).');
  }
}
