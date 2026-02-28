
import { db } from './db';
import { supabase } from './supabase';

export const syncData = async () => {
    console.log("Starting sync...");
    
    const allMembers = await db.members.toArray();
    const unsyncedMembers = allMembers.filter(m => !m.synced || m.synced === 0);
    console.log(`Found ${unsyncedMembers.length} unsynced members (Total local: ${allMembers.length}).`);
    
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
            plan_tipo: member.plan_tipo || 'Visita',
            plan_days: member.plan_days || 1,
            costo: member.costo || 0,
            is_promo: member.is_promo || false,
            notes: member.notes,
            fecha_inicio: member.fecha_inicio ? new Date(member.fecha_inicio).toISOString() : new Date().toISOString(),
            deleted: member.deleted || false,
            updated_at: member.updated_at ? new Date(member.updated_at).toISOString() : new Date().toISOString()
        }, { onConflict: 'memberId' });

        if (!error) {
            await db.members.update(member.id!, { synced: 1 });
        } else {
            console.error("Error syncing member:", error);
            throw new Error(`Error en miembro '${member.nombre}': ${error.message} - ${error.details}`);
        }
    }

    // 2. Sync Members (Pull)
    const { data: remoteMembers, error: pullError } = await supabase.from('members').select('*');
    if (pullError) {
        console.error("Error pulling members:", pullError);
        throw new Error(`Error pulling members: ${pullError.message}`);
    }
    
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
                      plan_days: rm.plan_days,
                      costo: rm.costo,
                      is_promo: rm.is_promo,
                      notes: rm.notes,
                      fecha_inicio: rm.fecha_inicio ? new Date(rm.fecha_inicio) : new Date(),
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
                    plan_days: rm.plan_days,
                    costo: rm.costo,
                    is_promo: rm.is_promo,
                    notes: rm.notes,
                    fecha_inicio: rm.fecha_inicio ? new Date(rm.fecha_inicio) : new Date(),
                    deleted: rm.deleted,
                    updated_at: remoteDate,
                    synced: 1
                });
            }
        }
    }

    // 2.5 Sync Member Plans (Push)
    const allMemberPlans = await db.member_plans.toArray();
    const unsyncedMemberPlans = allMemberPlans.filter(p => !p.synced || p.synced === 0);
    console.log(`Found ${unsyncedMemberPlans.length} unsynced member plans.`);

    for (const plan of unsyncedMemberPlans) {
        if (!plan.sync_id) continue;

        const { error } = await supabase.from('member_plans').upsert({
            id: plan.sync_id,
            memberId: plan.memberId,
            plan_id: plan.plan_id || null,
            plan_tipo: plan.plan_tipo,
            plan_days: plan.plan_days,
            costo: plan.costo,
            is_promo: plan.is_promo,
            notes: plan.notes,
            fecha_inicio: plan.fecha_inicio ? new Date(plan.fecha_inicio).toISOString() : new Date().toISOString(),
            deleted: plan.deleted || false,
            registered_by: plan.registered_by,
            registered_by_name: plan.registered_by_name,
            updated_at: plan.updated_at ? new Date(plan.updated_at).toISOString() : new Date().toISOString()
        }, { onConflict: 'id' });

        if (!error) {
            await db.member_plans.update(plan.id!, { synced: 1 });
        } else {
            console.error("Error syncing member plan:", error);
            throw new Error(`Error en plan: ${error.message} - ${error.details}`);
        }
    }

    // 2.75 Sync Member Plans (Pull)
    const { data: remoteMemberPlans, error: pullPlansError } = await supabase.from('member_plans').select('*');
    if (pullPlansError) {
        console.error("Error pulling member plans:", pullPlansError);
        throw new Error(`Error pulling member plans: ${pullPlansError.message}`);
    }
    
    if (remoteMemberPlans) {
        for (const rp of remoteMemberPlans) {
            const local = await db.member_plans.where('sync_id').equals(rp.id).first();
            const remoteDate = new Date(rp.updated_at);
            
            if (local) {
               const localDate = local.updated_at || new Date(0);
               if (remoteDate > localDate) {
                  await db.member_plans.update(local.id!, {
                      memberId: rp.memberId,
                      plan_id: rp.plan_id,
                      plan_tipo: rp.plan_tipo as any,
                      plan_days: rp.plan_days,
                      costo: rp.costo,
                      is_promo: rp.is_promo,
                      notes: rp.notes,
                      fecha_inicio: new Date(rp.fecha_inicio),
                      deleted: rp.deleted,
                      registered_by: rp.registered_by,
                      registered_by_name: rp.registered_by_name,
                      updated_at: remoteDate,
                      synced: 1
                  });
               }
            } else {
                await db.member_plans.add({
                    sync_id: rp.id,
                    memberId: rp.memberId,
                    plan_id: rp.plan_id,
                    plan_tipo: rp.plan_tipo as any,
                    plan_days: rp.plan_days,
                    costo: rp.costo,
                    is_promo: rp.is_promo,
                    notes: rp.notes,
                    fecha_inicio: new Date(rp.fecha_inicio),
                    deleted: rp.deleted,
                    registered_by: rp.registered_by,
                    registered_by_name: rp.registered_by_name,
                    updated_at: remoteDate,
                    synced: 1
                });
            }
        }
    }

    // 3. Sync Attendances (Push Only for now)
    const allAttendances = await db.attendances.toArray();
    const unsyncedAttendances = allAttendances.filter(a => !a.synced || a.synced === 0);
    console.log(`Found ${unsyncedAttendances.length} unsynced attendances (Total local: ${allAttendances.length}).`);

    for (const att of unsyncedAttendances) {
        let attMemberId = att.memberId;
        
        // Recover missing memberId for an attendance if it was created before the member was synced
        if (!attMemberId && att.miembroId) {
            const relatedMember = await db.members.get(att.miembroId);
            if (relatedMember?.memberId) {
                attMemberId = relatedMember.memberId;
                await db.attendances.update(att.id!, { memberId: attMemberId });
            }
        }
        
        if (!attMemberId) {
            console.warn(`Skipping attendance ${att.id} because it has no memberId link.`);
            continue;
        }

        const { error } = await supabase.from('attendances').insert({
            memberId: attMemberId,
            member_plan_id: att.member_plan_id || null,
            fecha_hora: att.fecha_hora 
                ? (typeof att.fecha_hora === 'string' ? new Date(att.fecha_hora).toISOString() : att.fecha_hora.toISOString())
                : new Date().toISOString(),
        });
        
        if (!error) {
            await db.attendances.update(att.id!, { synced: 1 });
        } else {
            console.error("Error syncing attendance:", error);
            throw new Error(`Error en asistencia: ${error.message}`);
        }
    }

    // 3.5 Sync Attendances (Pull)
    const { data: remoteAttendances, error: pullAttError } = await supabase.from('attendances').select('*');
    if (pullAttError) {
        console.error("Error pulling attendances:", pullAttError);
        throw new Error(`Error pulling attendances: ${pullAttError.message}`);
    }

    if (remoteAttendances) {
        // Fetch all local attendances to check against
        const localAttendances = await db.attendances.toArray();
        let addedCount = 0;

        for (const ra of remoteAttendances) {
            // Because we don't store the UUID of the attendance locally, we match by exact time & memberId
            // This is a naive but effective guard against inserting the same check-in twice
            const raDateStr = new Date(ra.fecha_hora).toISOString();
            
            const existsLocally = localAttendances.find(la => {
                const laDateStr = typeof la.fecha_hora === 'string' 
                                    ? new Date(la.fecha_hora).toISOString() 
                                    : la.fecha_hora.toISOString();
                return la.memberId === ra.memberId && laDateStr === raDateStr;
            });

            if (!existsLocally) {
                // Find local `miembroId` that corresponds to this Supabase `memberId`
                const localMember = await db.members.where('memberId').equals(ra.memberId).first();
                if (localMember) {
                    await db.attendances.add({
                        memberId: ra.memberId,
                        member_plan_id: ra.member_plan_id,
                        miembroId: localMember.id!, // Keep the legacy pointer
                        fecha_hora: new Date(ra.fecha_hora),
                        synced: 1, // It's already in the cloud
                        created_at: new Date(ra.created_at)
                    });
                    addedCount++;
                }
            }
        }
        
        if (addedCount > 0) {
            console.log(`Pulled and saved ${addedCount} new attendances from Supabase.`);
        }
    }

    // 4. Sync Staff (Push)
    // Note: We expect staff to be created mostly on Supabase and pulled down, but if created locally:
    const allStaff = await db.staff.toArray();
    const unsyncedStaff = allStaff.filter(s => !s.synced || s.synced === 0);
    console.log(`Found ${unsyncedStaff.length} unsynced staff.`);

    for (const user of unsyncedStaff) {
        let sid = user.staffId;
        if (!sid) {
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
            throw new Error(`Error en staff '${user.username}': ${error.message}`);
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
                        staffId: rs.staffId,
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
