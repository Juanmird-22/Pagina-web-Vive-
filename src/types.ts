export type View = 'Crear perfil' | 'Inicio' | 'Comunidad' | 'Agregar' | 'Notificaciones' | 'Perfil'

export type ModalName = 'celebration' | 'challenge' | 'premium' | 'avatar' | 'edit' | 'community' | 'confirm' | null

export type User = {
  id: string
  name: string
  email: string
  goal: string
}

export type Friend = {
  id: string
  username: string
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export type FriendRequest = {
  id: string
  senderId: string
  senderUsername: string
  receiverId: string
  receiverUsername: string
  status: FriendRequestStatus
  createdAt: string
}

export type Info = {
  age: number | null
  weight: number | null
  height: number | null
}

export type Comment = {
  id: number
  author: string
  text: string
}

export type Post = {
  id: string
  userId: string
  author: string
  initials: string
  avatar: string
  kind: string
  action: string
  time: string
  description: string
  image?: string
  imagePath?: string
  tags: string[]
  likes: number
  liked: boolean
  commentCount: number
}

export type Notification = {
  id: string
  category: 'Retos' | 'Comentarios' | 'Me gusta' | 'Amigos' | 'Meta'
  title: string
  time: string
  unread: boolean
  destination: View
  requestId?: string
}

export type WeightRecord = {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  weight: number // in kg
  height: number // in meters
  bmi: number // weight / (height * height)
  notes?: string
  createdAt?: string
}

export type ChallengeCategory =
  | 'Actividad física'
  | 'Alimentación saludable'
  | 'Hidratación'
  | 'Descanso y sueño'
  | 'Salud mental'
  | 'Constancia'

export type ChallengeDuration = 'Diario' | '3 días' | '5 días' | '7 días' | '14 días'
export type ChallengeDifficulty = 'Fácil' | 'Intermedio' | 'Progresivo'

export type Challenge = {
  id: string
  title: string
  category: ChallengeCategory
  duration: ChallengeDuration
  totalDays: number
  difficulty: ChallengeDifficulty
  objective: string
  description: string
  completionMethod: string
  icon: string
  goalMatch?: string // optional match to user goal
}

export type UserChallengeProgress = {
  challengeId: string
  daysCompleted: number
  lastCompletedDate?: string
  completed: boolean
}

export type AccessibilitySettings = {
  textScale: number // 1 = 100%, 1.15 = 115%, 1.3 = 130%
  highContrast: boolean
  reduceMotion: boolean
}
