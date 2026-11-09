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

const REQUESTS_KEY = 'vive_friend_requests'

function getLocalRequests(): FriendRequest[] {
  try {
    const data = localStorage.getItem(REQUESTS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveLocalRequests(requests: FriendRequest[]) {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests))
  } catch {
    // ignore
  }
}

export async function fetchFriendRequests(userId: string): Promise<{
  received: FriendRequest[]
  sent: FriendRequest[]
}> {
  let allRequests = getLocalRequests()

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

    if (!error && data && Array.isArray(data)) {
      // Map database rows
      const dbRequests: FriendRequest[] = data.map((r: any) => ({
        id: String(r.id),
        senderId: r.sender_id,
        senderUsername: '',
        receiverId: r.receiver_id,
        receiverUsername: '',
        status: r.status as FriendRequestStatus,
        createdAt: r.created_at,
      }))

      // Merge with local requests to keep usernames
      const map = new Map<string, FriendRequest>()
      allRequests.forEach(req => map.set(`${req.senderId}_${req.receiverId}`, req))
      dbRequests.forEach(req => {
        const key = `${req.senderId}_${req.receiverId}`
        const existing = map.get(key)
        map.set(key, {
          ...req,
          senderUsername: existing?.senderUsername || req.senderUsername,
          receiverUsername: existing?.receiverUsername || req.receiverUsername,
        })
      })
      allRequests = Array.from(map.values())
      saveLocalRequests(allRequests)
    }
  } catch {
    // ignore
  }

  const received = allRequests.filter(r => r.receiverId === userId && r.status === 'pending')
  const sent = allRequests.filter(r => r.senderId === userId)

  return { received, sent }
}

export async function sendFriendRequest(
  senderId: string,
  senderUsername: string,
  receiverId: string,
  receiverUsername: string
): Promise<{ success: boolean; request?: FriendRequest; error?: string }> {
  if (senderId === receiverId) {
    return { success: false, error: 'No puedes enviarte una solicitud a ti mismo.' }
  }

  const allRequests = getLocalRequests()
  const existing = allRequests.find(
    r =>
      (r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending') ||
      (r.senderId === receiverId && r.receiverId === senderId && r.status === 'pending')
  )

  if (existing) {
    return { success: false, error: 'Ya existe una solicitud pendiente entre ambos.' }
  }

  const newRequest: FriendRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderId,
    senderUsername,
    receiverId,
    receiverUsername,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  // Update local list
  const updated = [newRequest, ...allRequests.filter(r => !(r.senderId === senderId && r.receiverId === receiverId))]
  saveLocalRequests(updated)

  // Database attempt
  try {
    const { data } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
      })
      .select('id')
      .single()

    if (data?.id) {
      newRequest.id = String(data.id)
    }
  } catch {
    // Database table might not be present yet, fallback works
  }

  // Broadcast to other sessions/tabs via Supabase Realtime
  try {
    const channel = supabase.channel('friend-requests-sync')
    await channel.send({
      type: 'broadcast',
      event: 'request_sent',
      payload: newRequest,
    })
  } catch {
    // ignore
  }

  return { success: true, request: newRequest }
}

export async function acceptFriendRequest(
  requestId: string,
  senderId: string,
  receiverId: string,
  senderUsername: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Add friendship in Supabase
  const { error: friendError } = await supabase.from('friends').insert({
    user_id: receiverId,
    friend_id: senderId,
  })

  if (friendError) {
    return { success: false, error: 'No se pudo agregar a tus amigos. Intenta de nuevo.' }
  }

  // 2. Update request status to accepted
  const allRequests = getLocalRequests()
  const updated = allRequests.map(r =>
    r.id === requestId || (r.senderId === senderId && r.receiverId === receiverId)
      ? { ...r, status: 'accepted' as FriendRequestStatus }
      : r
  )
  saveLocalRequests(updated)

  try {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
  } catch {
    // ignore
  }

  // Broadcast update
  try {
    const channel = supabase.channel('friend-requests-sync')
    await channel.send({
      type: 'broadcast',
      event: 'request_accepted',
      payload: { requestId, senderId, receiverId, senderUsername },
    })
  } catch {
    // ignore
  }

  return { success: true }
}

export async function rejectFriendRequest(
  requestId: string,
  senderId: string,
  receiverId: string
): Promise<{ success: boolean }> {
  const allRequests = getLocalRequests()
  const updated = allRequests.map(r =>
    r.id === requestId || (r.senderId === senderId && r.receiverId === receiverId)
      ? { ...r, status: 'rejected' as FriendRequestStatus }
      : r
  )
  saveLocalRequests(updated)

  try {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
  } catch {
    // ignore
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
