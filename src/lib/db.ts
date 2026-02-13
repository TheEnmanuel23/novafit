
// src/lib/db.ts
import Dexie, { Table } from 'dexie';
import { Member, Attendance } from './types';

class NovaFitDatabase extends Dexie {
  members!: Table<Member, number>;
  attendances!: Table<Attendance, number>;


  constructor() {
    super('NovaFitDB');
    this.version(4).stores({
      members: '++id, nombre, telefono, plan_tipo, fecha_inicio, costo, is_promo, deleted', // Added deleted index
      attendances: '++id, miembroId, fecha_hora',
    });

    this.version(5).stores({
      members: '++id, memberId, nombre, telefono, plan_tipo, fecha_inicio, costo, is_promo, deleted',
      attendances: '++id, miembroId, fecha_hora',
    }).upgrade(async tx => {
      const members = await tx.table('members').toArray();
      const nameToId = new Map<string, string>();
      
      for (const m of members) {
        if (!m.memberId) {
          // Normalize name to group accurately
          const key = m.nombre.toLowerCase().trim();
          let mid = nameToId.get(key);
          if (!mid) {
            mid = crypto.randomUUID();
            nameToId.set(key, mid);
          }
          await tx.table('members').update(m.id, { memberId: mid });
        }
      }
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
