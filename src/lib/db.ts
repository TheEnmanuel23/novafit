
// src/lib/db.ts
import Dexie, { Table } from 'dexie';
import { Member, MemberPlan, Attendance, Staff } from './types';

class NovaFitDatabase extends Dexie {
  members!: Table<Member, number>;
  member_plans!: Table<MemberPlan, number>;
  attendances!: Table<Attendance, number>;
  settings!: Table<{ key: string; value: any }, string>; 
  staff!: Table<Staff, number>; 



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

    this.version(6).stores({
      attendances: '++id, memberId, miembroId, fecha_hora',
    }).upgrade(async tx => {
      const attendances = await tx.table('attendances').toArray();
      const members = await tx.table('members').toArray();
      const memberMap = new Map();
      members.forEach(m => {
          if (m.id && m.memberId) memberMap.set(m.id, m.memberId);
      });
      
      for (const att of attendances) {
        if (!att.memberId) {
            const mid = memberMap.get(att.miembroId);
            if (mid) {
                await tx.table('attendances').update(att.id, { memberId: mid });
            }
        }
      }
    });
    this.version(7).stores({
      members: '++id, memberId, nombre, telefono, plan_tipo, fecha_inicio, costo, is_promo, deleted, updated_at, synced',
      attendances: '++id, memberId, miembroId, fecha_hora, updated_at, synced',
      settings: 'key'
    }).upgrade(async tx => {
      await tx.table('members').toCollection().modify({ synced: 0, updated_at: new Date() });
      await tx.table('attendances').toCollection().modify({ synced: 0, updated_at: new Date() });
    });

    this.members.hook('creating', (_primKey, obj) => {
      obj.updated_at = new Date();
      obj.synced = 0;
    });
    this.members.hook('updating', (mods, _primKey, _obj) => {
      if ((mods as any).synced === 1) return undefined;
      return { ...mods, updated_at: new Date(), synced: 0 };
    });

    this.attendances.hook('creating', (_primKey, obj) => {
      obj.updated_at = new Date();
      obj.synced = 0;
    });
    this.attendances.hook('updating', (mods, _primKey, _obj) => {
       if ((mods as any).synced === 1) return undefined;
       return { ...mods, updated_at: new Date(), synced: 0 };
    });

    this.version(8).stores({
        staff: '++id, staffId, username, role, updated_at, synced'
    });

    this.staff.hook('creating', (_primKey, obj) => {
        obj.updated_at = new Date();
        obj.synced = 0;
        obj.created_at = new Date();
    });
    this.staff.hook('updating', (mods, _primKey, _obj) => {
        if ((mods as any).synced === 1) return undefined;
        return { ...mods, updated_at: new Date(), synced: 0 };
    });

    // Version 9: Database Normalization (member_plans extraction)
    this.version(9).stores({
      member_plans: '++id, sync_id, memberId, plan_tipo, fecha_inicio, deleted, updated_at, synced',
      attendances: '++id, memberId, member_plan_id, miembroId, fecha_hora, updated_at, synced' // updated indexes
    }).upgrade(async tx => {
      // Migrate all existing members into member_plans
      const legacyMembers = await tx.table('members').toArray();
      const plansToInsert = legacyMembers.map(m => ({
        sync_id: crypto.randomUUID(), // New UUID for the plan record
        memberId: m.memberId,
        plan_tipo: m.plan_tipo || 'Mensual',
        plan_days: m.plan_days || 30,
        costo: m.costo || 0,
        is_promo: m.is_promo || false,
        notes: m.notes || '',
        fecha_inicio: m.fecha_inicio || new Date(),
        deleted: m.deleted || false,
        updated_at: m.updated_at || new Date(),
        synced: 0,
        registered_by: m.registered_by,
        registered_by_name: m.registered_by_name
      }));
      
      if (plansToInsert.length > 0) {
        await tx.table('member_plans').bulkAdd(plansToInsert);
      }
      
      // Update attendances: try to find the newest member_plan for the user and link it
      const attendances = await tx.table('attendances').toArray();
      const allPlans = await tx.table('member_plans').toArray();
      
      for (const att of attendances) {
        // Find a plan matching this member's ID
        const matchingPlan = allPlans.find(p => p.memberId === att.memberId);
        if (matchingPlan) {
          await tx.table('attendances').update(att.id, { member_plan_id: matchingPlan.sync_id });
        }
      }
    });

    this.member_plans.hook('creating', (_primKey, obj) => {
      obj.updated_at = new Date();
      obj.synced = 0;
    });
    this.member_plans.hook('updating', (mods, _primKey, _obj) => {
      if ((mods as any).synced === 1) return undefined;
      return { ...mods, updated_at: new Date(), synced: 0 };
    });
  }
}

export const db = new NovaFitDatabase();

