'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAppDate } from '@novafit/supabase/src/utils/date'
import { getMemberById } from '@novafit/supabase/src/queries/members'
import { getMemberPlanHistory } from '@novafit/supabase/src/queries/member-plans'
import { getMemberAttendances } from '@novafit/supabase/src/queries/checkin'
import type { MemberWithStatus } from '@novafit/types'

export type AuthenticatedMember = {
  id: string
  member_id: string
  username: string
  name: string
  phone: string | null
}

export type MemberDashboardData = {
  member: MemberWithStatus & {
    creator?: { name: string } | null
    updater?: { name: string } | null
  }
  planHistory: any[]
  attendances: any[]
  appDateISO: string
}

function getMemberAuthEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/\s+/g, '')
  return `${clean}@member.novafit.local`
}

export async function fetchMemberDashboardData(memberId: string): Promise<MemberDashboardData | null> {
  const adminClient = createServiceClient()
  const member = await getMemberById(adminClient, memberId)
  if (!member) return null

  const [planHistory, attendances, appDate] = await Promise.all([
    getMemberPlanHistory(adminClient, member.member_id),
    getMemberAttendances(adminClient, member.member_id),
    getAppDate(),
  ])

  return {
    member: member as MemberDashboardData['member'],
    planHistory,
    attendances,
    appDateISO: appDate.toISOString(),
  }
}

export async function getAuthenticatedMemberDashboard(): Promise<MemberDashboardData | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email?.endsWith('@member.novafit.local')) {
      return null
    }

    const usernameFromEmail = user.email.replace('@member.novafit.local', '').toUpperCase()
    const adminClient = createServiceClient()

    const { data: memberRow } = await adminClient
      .from('members')
      .select('member_id')
      .eq('username', usernameFromEmail)
      .eq('deleted', false)
      .maybeSingle()

    if (!memberRow) return null
    return await fetchMemberDashboardData(memberRow.member_id)
  } catch (err) {
    console.error('[MemberAuth:getAuthenticatedMemberDashboard] Error:', err)
    return null
  }
}

export async function registerMemberAccount(formData: FormData): Promise<{
  error?: string
  success?: boolean
  member?: AuthenticatedMember
}> {
  const rawUsername = (formData.get('username') as string) || ''
  const rawName = (formData.get('name') as string) || ''
  const rawPhone = (formData.get('phone') as string) || ''
  const password = (formData.get('password') as string) || ''
  const confirmPassword = (formData.get('confirmPassword') as string) || ''

  const cleanUsername = rawUsername.trim().toUpperCase()
  const cleanName = rawName.trim().replace(/\s+/g, ' ')
  const cleanPhone = rawPhone.trim() || null

  if (!cleanUsername) {
    return { error: 'No se proporcionó un ID de usuario válido en el enlace de registro.' }
  }

  if (!cleanName) {
    return { error: 'Por favor ingresa tu nombre.' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const adminClient = createServiceClient()

  // 1. Verify the member exists in the database
  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('id, member_id, username, name, phone')
    .eq('username', cleanUsername)
    .eq('deleted', false)
    .maybeSingle()

  if (memberError) {
    console.error('[MemberAuth:registerMemberAccount] DB Error:', memberError)
    return { error: 'Error al verificar tu cuenta de miembro.' }
  }

  if (!member) {
    return { error: `No se encontró ningún miembro registrado con el ID ${cleanUsername}.` }
  }

  // 2. Create the Supabase Auth account for this member
  const email = getMemberAuthEmail(cleanUsername)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      member_id: member.member_id,
      username: member.username,
      role: 'member',
    },
  })

  if (authError || !authData?.user) {
    console.error('[MemberAuth:registerMemberAccount] Auth Create Error:', authError)
    if (
      authError?.message?.toLowerCase().includes('already') ||
      authError?.message?.toLowerCase().includes('registered')
    ) {
      return {
        error: 'Esta cuenta ya fue activada anteriormente. Por favor inicia sesión con tu contraseña.',
      }
    }
    return { error: 'No se pudo activar la cuenta. Intenta nuevamente.' }
  }

  // 3. Update member's name and phone in the members table
  const appDate = await getAppDate()
  const { data: updatedMember, error: updateError } = await adminClient
    .from('members')
    .update({
      name: cleanName,
      phone: cleanPhone,
      updated_at: appDate.toISOString(),
    })
    .eq('member_id', member.member_id)
    .select('id, member_id, username, name, phone')
    .single()

  if (updateError) {
    console.error('[MemberAuth:registerMemberAccount] Update Member Error:', updateError)
  }

  return {
    success: true,
    member: (updatedMember || { ...member, name: cleanName, phone: cleanPhone }) as AuthenticatedMember,
  }
}

export async function signInMember(formData: FormData): Promise<{
  error?: string
  success?: boolean
  dashboard?: MemberDashboardData
}> {
  const rawUsername = (formData.get('username') as string) || ''
  const password = (formData.get('password') as string) || ''

  const cleanUsername = rawUsername.trim().toUpperCase()

  if (!cleanUsername || !password) {
    return { error: 'Por favor ingresa tu usuario y contraseña.' }
  }

  const adminClient = createServiceClient()

  // 1. Verify the member exists and is active in members table
  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('id, member_id, username, name, phone')
    .eq('username', cleanUsername)
    .eq('deleted', false)
    .maybeSingle()

  if (memberError) {
    console.error('[MemberAuth:signInMember] DB Error:', memberError)
    return { error: 'Error al verificar las credenciales.' }
  }

  if (!member) {
    return { error: 'Usuario o contraseña incorrectos.' }
  }

  // 2. Authenticate with Supabase Auth using the member's registered password
  const email = getMemberAuthEmail(cleanUsername)
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData?.user) {
    console.warn(`[MemberAuth:signInMember] Failed sign-in for ${cleanUsername}:`, authError?.message)
    return {
      error: 'Usuario o contraseña incorrectos. Si es tu primera vez, activa tu cuenta desde el enlace de registro.',
    }
  }

  // 3. Log client session
  try {
    await adminClient.from('user_sessions').insert({
      auth_user_id: authData.user.id,
      user_type: 'client',
      action: 'login',
    })
  } catch (err) {
    console.error('[MemberAuth:signInMember] Failed to log session:', err)
  }

  const dashboard = await fetchMemberDashboardData(member.member_id)
  if (!dashboard) {
    return { error: 'No se pudo cargar la información del miembro.' }
  }

  return {
    success: true,
    dashboard,
  }
}

export async function signOutMember(): Promise<void> {
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const adminClient = createServiceClient()
      await adminClient.from('user_sessions').insert({
        auth_user_id: user.id,
        user_type: 'client',
        action: 'logout',
      })
    }
  } catch (err) {
    console.error('[MemberAuth:signOutMember] Failed to log session:', err)
  }

  await supabase.auth.signOut()
}
