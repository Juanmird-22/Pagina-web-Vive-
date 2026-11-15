import { supabase } from '../supabaseClient'
import type { WeightRecord, FriendRequest, FriendRequestStatus, UserChallengeProgress } from '../types'

// Helper: Calculate BMI
export function calculateBMI(weightKg: number, heightM: number): number {
  if (!weightKg || !heightM || heightM <= 0) return 0
  const bmi = weightKg / (heightM * heightM)
  return Number(bmi.toFixed(2))
}

// Helper: Get BMI classification info
export function getBMICategory(bmi: number): {
  label: string
  color: string
  badgeClass: string
  description: string
} {
  if (bmi <= 0) {
    return {
      label: 'Sin calcular',
      color: '#4A5A64',
      badgeClass: 'bmi-badge--none',
      description: 'Ingresa tu peso y altura.',
    }
  }
  if (bmi < 18.5) {
    return {
      label: 'Bajo peso',
      color: '#1DA0DB',
      badgeClass: 'bmi-badge--underweight',
      description: 'Tu peso está por debajo del rango habitual sugerido.',
    }
  }
  if (bmi < 25) {
    return {
      label: 'Peso saludable',
      color: '#1DDBAF',
      badgeClass: 'bmi-badge--normal',
      description: 'Te encuentras en un rango considerado saludable y equilibrado.',
    }
  }
  if (bmi < 30) {
    return {
      label: 'Sobrepeso',
      color: '#DBAD1D',
      badgeClass: 'bmi-badge--overweight',
      description: 'Ligeramente por encima del rango promedio sugerido.',
    }
  }
  return {
    label: 'Obesidad',
    color: '#E57A6F',
    badgeClass: 'bmi-badge--obese',
    description: 'Por encima del rango recomendado para la estatura.',
  }
}

// ==============================================================================
// WEIGHT & PROGRESS SERVICE
// ==============================================================================

const WEIGHTS_KEY_PREFIX = 'vive_weights_'

export async function fetchWeightRecords(userId: string): Promise<WeightRecord[]> {
  const localKey = `${WEIGHTS_KEY_PREFIX}${userId}`
  const cached: WeightRecord[] = (() => {
    try {
      const data = localStorage.getItem(localKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  })()

  try {
    const { data, error } = await supabase
      .from('weight_records')
      .select('id, user_id, date, weight, height, bmi, notes, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (!error && data && Array.isArray(data)) {
      const dbRecords: WeightRecord[] = data.map((r: any) => ({
        id: String(r.id),
        userId: r.user_id,
        date: r.date,
        weight: Number(r.weight),
        height: Number(r.height),
        bmi: Number(r.bmi),
        notes: r.notes || '',
        createdAt: r.created_at,
      }))
      // Merge with cache if any exists
      const mergedMap = new Map<string, WeightRecord>()
      cached.forEach(r => mergedMap.set(r.date, r))
      dbRecords.forEach(r => mergedMap.set(r.date, r))
      const merged = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      localStorage.setItem(localKey, JSON.stringify(merged))
      return merged
    }
  } catch {
    // ignore network/db error and fallback to cache
  }

  return cached
}

export async function saveWeightRecord(
  userId: string,
  weight: number,
  height: number,
  date: string,
  notes: string = ''
): Promise<{ success: boolean; record: WeightRecord; error?: string }> {
  const bmi = calculateBMI(weight, height)
  const localKey = `${WEIGHTS_KEY_PREFIX}${userId}`
  const currentRecords = await fetchWeightRecords(userId)

  const newRecord: WeightRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    date,
    weight,
    height,
    bmi,
    notes,
    createdAt: new Date().toISOString(),
  }

  // Check if date already exists in list (update if exists, else add)
  const existingIdx = currentRecords.findIndex(r => r.date === date)
  let updatedList: WeightRecord[]
  if (existingIdx >= 0) {
    updatedList = [...currentRecords]
    updatedList[existingIdx] = { ...updatedList[existingIdx], weight, height, bmi, notes }
  } else {
    updatedList = [...currentRecords, newRecord].sort((a, b) => a.date.localeCompare(b.date))
  }

  // Update local storage
  try {
    localStorage.setItem(localKey, JSON.stringify(updatedList))
  } catch {
    // ignore
  }

  // Update profile current weight and height
  try {
    await supabase.from('profiles').update({ weight, height }).eq('id', userId)
  } catch {
    // ignore
  }

  // Attempt database insert/upsert
  try {
    const { data, error } = await supabase
      .from('weight_records')
      .upsert(
        {
          user_id: userId,
          date,
          weight,
          height,
          bmi,
          notes,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()

    if (!error && data) {
      newRecord.id = String(data.id)
    }
  } catch {
    // Database table might not be created yet, local record still valid
  }

  return { success: true, record: newRecord }
}

export async function deleteWeightRecord(
  userId: string,
  recordId: string,
  date: string
): Promise<boolean> {
  const localKey = `${WEIGHTS_KEY_PREFIX}${userId}`
  const currentRecords = await fetchWeightRecords(userId)
  const filtered = currentRecords.filter(r => r.id !== recordId && r.date !== date)

  try {
    localStorage.setItem(localKey, JSON.stringify(filtered))
  } catch {
    // ignore
  }

  try {
    await supabase.from('weight_records').delete().eq('user_id', userId).eq('date', date)
  } catch {
    // ignore
  }

  return true
}

// ==============================================================================
// FRIEND REQUESTS SERVICE
// ==============================================================================


export async function fetchFriendRequests(userId: string): Promise<{
  received: FriendRequest[]
  sent: FriendRequest[]
}> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error cargando solicitudes:', error)
    return { received: [], sent: [] }
  }

  const rows = data ?? []

  // Obtener usernames mediante la función RPC
  const { data: profiles, error: profilesError } = await supabase
    .rpc('obtener_perfiles_solicitudes')

  if (profilesError) {
    console.error('Error obteniendo usernames:', profilesError)
    return { received: [], sent: [] }
  }

const profilesTyped = (profiles ?? []) as {
  id: string
  username: string
}[]

const names = new Map<string, string>(
  profilesTyped.map(
    (p): [string, string] => [p.id, p.username]
  )
)

  const requests: FriendRequest[] = rows.map(r => ({
    id: String(r.id),
    senderId: r.sender_id,
    senderUsername: names.get(r.sender_id) || 'Usuario',
    receiverId: r.receiver_id,
    receiverUsername: names.get(r.receiver_id) || 'Usuario',
    status: r.status as FriendRequestStatus,
    createdAt: r.created_at
  }))

  return {
    received: requests.filter(
      r => r.receiverId === userId && r.status === 'pending'
    ),
    sent: requests.filter(r => r.senderId === userId)
  }
}


export async function sendFriendRequest(
  senderId: string,
  senderUsername: string,
  receiverId: string,
  receiverUsername: string
): Promise<{ success: boolean; request?: FriendRequest; error?: string }> {

  if (!senderId || !receiverId || senderId === receiverId) {
    return { success: false, error: 'No puedes enviarte una solicitud a ti mismo.' }
  }

  const { data: existingFriend, error: friendError } = await supabase
    .from('friends')
    .select('user_id')
    .eq('user_id', senderId)
    .eq('friend_id', receiverId)
    .maybeSingle()

  if (friendError) {
    return { success: false, error: 'No se pudo verificar la amistad.' }
  }

  if (existingFriend) {
    return { success: false, error: 'Ya son amigos.' }
  }

  const { data: existingRequest, error: requestError } = await supabase
    .from('friend_requests')
    .select('id, status')
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
    )
    .eq('status', 'pending')
    .maybeSingle()

  if (requestError) {
    return { success: false, error: 'No se pudo verificar la solicitud.' }
  }

  if (existingRequest) {
    return {
      success: false,
      error: 'Ya existe una solicitud pendiente entre ambos.'
    }
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending'
    })
    .select('id, created_at')
    .single()

  if (error || !data) {
    console.error(error)
    return {
      success: false,
      error: 'No se pudo enviar la solicitud. Intenta nuevamente.'
    }
  }

  return {
    success: true,
    request: {
      id: String(data.id),
      senderId,
      senderUsername,
      receiverId,
      receiverUsername,
      status: 'pending',
      createdAt: data.created_at
    }
  }
}

export async function acceptFriendRequest(
  requestId: string,
  senderId: string,
  receiverId: string,
  senderUsername: string
): Promise<{ success: boolean; error?: string }> {

  const { data: request, error: findError } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status')
    .eq('id', requestId)
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .single()

  if (findError || !request) {
    return {
      success: false,
      error: 'La solicitud ya no está disponible.'
    }
  }

  const { error: friendshipError } = await supabase.rpc(
    'accept_friend_request',
    { p_request_id: requestId }
  )

  if (friendshipError) {
    console.error(friendshipError)
    return {
      success: false,
      error: 'No se pudo aceptar la solicitud.'
    }
  }

  return { success: true }
}

export async function rejectFriendRequest(
  requestId: string,
  senderId: string,
  receiverId: string
): Promise<{ success: boolean }> {

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')

  if (error) {
    console.error(error)
    return { success: false }
  }

  return { success: true }
}

// ==============================================================================
// CHALLENGES PROGRESS SERVICE
// ==============================================================================

const CHALLENGES_KEY_PREFIX = 'vive_user_challenges_'

export function getUserChallengesProgress(userId: string): Record<string, UserChallengeProgress> {
  if (!userId) return {}
  try {
    const data = localStorage.getItem(`${CHALLENGES_KEY_PREFIX}${userId}`)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function saveUserChallengeProgress(
  userId: string,
  challengeId: string,
  totalDays: number,
  today: string
): { completed: boolean; daysCompleted: number } {
  const progressMap = getUserChallengesProgress(userId)
  const current = progressMap[challengeId] || {
    challengeId,
    daysCompleted: 0,
    completed: false,
  }

  // If already logged today, do not increment again today
  if (current.lastCompletedDate === today) {
    return { completed: current.completed, daysCompleted: current.daysCompleted }
  }

  const nextDays = current.daysCompleted + 1
  const isFinished = nextDays >= totalDays

  progressMap[challengeId] = {
    challengeId,
    daysCompleted: Math.min(totalDays, nextDays),
    lastCompletedDate: today,
    completed: isFinished,
  }

  try {
    localStorage.setItem(`${CHALLENGES_KEY_PREFIX}${userId}`, JSON.stringify(progressMap))
  } catch {
    // ignore
  }

  return { completed: isFinished, daysCompleted: Math.min(totalDays, nextDays) }
}
