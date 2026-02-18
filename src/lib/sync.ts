
import { db } from './db';
import { supabase } from './supabase';

export const syncData = async () => {
    console.log("Starting sync...");
    
    // 1. Sync Members (Push)
    const unsyncedMembers = await db.members.where('synced').equals(0).toArray();
    console.log(`Found ${unsyncedMembers.length} unsynced members.`);
    
    for (const member of unsyncedMembers) {
        let mid = member.memberId;
        // Generate UUID if missing
        if (!mid) {
            mid = crypto.randomUUID();
            await db.members.update(member.id!, { memberId: mid });
        }

        const { error } = await supabase.from('members').upsert({
            memberId: mid, // Unique Identifier
            nombre: member.nombre,
            telefono: member.telefono,
            plan_tipo: member.plan_tipo,
            costo: member.costo,
            is_promo: member.is_promo,
            notes: member.notes,
            fecha_inicio: member.fecha_inicio.toISOString(),
            deleted: member.deleted || false,
            updated_at: new Date().toISOString()
        }, { onConflict: 'memberId' });

        if (!error) {
            // Mark as synced
            // We pass synced: 1 explicitly, our hook will allow it without resetting updated_at
            await db.members.update(member.id!, { synced: 1 });
        } else {
            console.error("Error syncing member:", error);
        }
    }

    // 2. Sync Members (Pull)
    // Fetch all members from server to update local state
    // In a real app, use 'last_synced_at' to fetch only changes.
    const { data: remoteMembers, error: pullError } = await supabase.from('members').select('*');
    
    if (remoteMembers) {
        for (const rm of remoteMembers) {
            const local = await db.members.where('memberId').equals(rm.memberId).first();
            const remoteDate = new Date(rm.updated_at);
            
            if (local) {
               const localDate = local.updated_at || new Date(0);
               // Update local if remote is newer
               if (remoteDate > localDate) {
                  await db.members.update(local.id!, {
                      nombre: rm.nombre, 
                      telefono: rm.telefono,
                      plan_tipo: rm.plan_tipo as any,
                      costo: rm.costo,
                      is_promo: rm.is_promo,
                      notes: rm.notes,
                      fecha_inicio: new Date(rm.fecha_inicio),
                      deleted: rm.deleted,
                      updated_at: remoteDate,
                      synced: 1
                  });
               }
            } else {
                // Insert new member from server
                await db.members.add({
                    memberId: rm.memberId,
                    nombre: rm.nombre,
                    telefono: rm.telefono,
                    plan_tipo: rm.plan_tipo as any,
                    costo: rm.costo,
                    is_promo: rm.is_promo,
                    notes: rm.notes,
                    fecha_inicio: new Date(rm.fecha_inicio),
                    deleted: rm.deleted,
                    updated_at: remoteDate,
                    synced: 1
                });
            }
        }
    }

    // 3. Sync Attendances (Push Only for now)
    const unsyncedAttendances = await db.attendances.where('synced').equals(0).toArray();
    console.log(`Found ${unsyncedAttendances.length} unsynced attendances.`);

    for (const att of unsyncedAttendances) {
        if (!att.memberId) continue; // Skip if no memberId link

        const { error } = await supabase.from('attendances').insert({
            memberId: att.memberId,
            fecha_hora: att.fecha_hora.toISOString(),
        });
        
        if (!error) {
            await db.attendances.update(att.id!, { synced: 1 });
        } else {
            console.error("Error syncing attendance:", error);
        }
    }

    // 4. Sync Staff (Push)
    // Note: We expect staff to be created mostly on Supabase and pulled down, but if created locally:
    const unsyncedStaff = await db.staff.where('synced').equals(0).toArray();
    console.log(`Found ${unsyncedStaff.length} unsynced staff.`);

    for (const user of unsyncedStaff) {
        let sid = user.staffId;
        if (!sid) {
            // Generate simple ID if missing (or UUID if preferred, but user asked for simple strings)
            // Ideally username is unique enough, but let's stick to an ID.
            // If user creates it locally, we might just default to UUID, but if they want "normal strings", 
            // they probably mean when inserting manually in Supabase.
            // For auto-gen locally, we'll stick to random string or UUID.
            sid = crypto.randomUUID(); 
            await db.staff.update(user.id!, { staffId: sid });
        }

        const { error } = await supabase.from('staff').upsert({
            staffId: sid,
            nombre: user.nombre,
            username: user.username,
            password: user.password,
            role: user.role,
            deleted: user.deleted || false,
            updated_at: new Date().toISOString()
        }, { onConflict: 'staffId' });

        if (!error) {
            await db.staff.update(user.id!, { synced: 1 });
        } else {
            console.error("Error syncing staff:", error);
        }
    }

    // 5. Sync Staff (Pull)
    const { data: remoteStaff, error: staffError } = await supabase.from('staff').select('*');
    if (remoteStaff) {
        for (const rs of remoteStaff) {
            // Match by staffId (which is now string/text in DB)
            const local = await db.staff.where('staffId').equals(rs.staffId).first();
            const remoteDate = new Date(rs.updated_at);

            if (local) {
                const localDate = local.updated_at || new Date(0);
                if (remoteDate > localDate) {
                    await db.staff.update(local.id!, {
                        nombre: rs.nombre,
                        username: rs.username,
                        password: rs.password,
                        role: rs.role as any,
                        deleted: rs.deleted,
                        updated_at: remoteDate,
                        synced: 1
                    });
                }
            } else {
                await db.staff.add({
                    staffId: rs.staffId,
                    nombre: rs.nombre,
                    username: rs.username,
                    password: rs.password,
                    role: rs.role as any,
                    deleted: rs.deleted,
                    updated_at: remoteDate,
                    created_at: new Date(rs.created_at),
                    synced: 1
                });
            }
        }
    }
    
    console.log("Sync completed.");
};
