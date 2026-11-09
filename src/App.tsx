import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from './supabaseClient'
import type {
  View,
  ModalName,
  User,
  Friend,
  FriendRequest,
  Info,
  Comment,
  Post,
  Notification,
  WeightRecord,
  Challenge,
  UserChallengeProgress,
} from './types'
import {
  fetchWeightRecords,
  saveWeightRecord,
  deleteWeightRecord,
  fetchFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getUserChallengesProgress,
  saveUserChallengeProgress,
} from './services/storageService'
import { ConfirmModal } from './components/ConfirmModal'
import { AccessibilityWidget } from './components/AccessibilityWidget'
import { DailyProgressSection } from './components/DailyProgressSection'
import { ChallengesSection, CHALLENGES_CATALOG } from './components/ChallengesSection'

const C = {
  navy: '#0B2545',
  blue: '#1DA0DB',
  green: '#1DDBAF',
  yellow: '#DBAD1D',
  bg: '#F4F9FB',
  white: '#FFFFFF',
  border: '#DCE6EB',
  text: '#4A5A64',
}

const GOAL_LABELS: Record<string, string> = {
  bajar: 'Bajar de peso',
  salud: 'Ganar salud',
  verdura: 'Comer más verdura',
  ejercicio: 'Hacer más ejercicio',
}

const GOAL_CHALLENGES: Record<string, string> = {
  'Bajar de peso': 'Camina 20 min',
  'Ganar salud': 'Toma 6 vasos de agua',
  'Comer más verdura': 'Añade verdura a tu almuerzo',
  'Hacer más ejercicio': 'Muévete durante 20 min',
}

const INITIAL_POSTS: Post[] = []
const INITIAL_NOTIFICATIONS: Notification[] = []

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'V+'
}

function username(name: string) {
  return `@${name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}`
}

const PALETTE = [C.blue, C.green, C.yellow, C.navy, '#8B6BB5', '#E57A6F']

function colorOf(name: string) {
  return PALETTE[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PALETTE.length]
}

function ago(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  if (minutes < 1440) return `hace ${Math.floor(minutes / 60)} h`
  return `hace ${Math.floor(minutes / 1440)} d`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPost(r: any): Post {
  return {
    id: r.id,
    userId: r.user_id,
    author: r.username,
    initials: initials(r.username),
    avatar: colorOf(r.username),
    kind: r.kind,
    action: r.kind === 'Comida' ? 'compartió su registro' : 'completó un ejercicio',
    time: ago(r.created_at),
    description: r.description,
    imagePath: r.image_path ?? undefined,
    image: r.image_path ? supabase.storage.from('fotos').getPublicUrl(r.image_path).data.publicUrl : undefined,
    tags: r.tags ?? [],
    likes: Number(r.likes),
    liked: Boolean(r.liked),
    commentCount: Number(r.comments),
  }
}

async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    return blob ?? file
  } catch {
    return file
  }
}

function day(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-CA')
}

function Icon({ name, size = 20 }: { name: 'home' | 'users' | 'plus' | 'bell' | 'user' | 'heart' | 'comment' | 'search' | 'flame' | 'close' | 'camera' | 'chevron'; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z" /></>,
    users: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M17 4a4 4 0 0 1 0 8M22 21v-2a5 5 0 0 0-3-4.6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 20h4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-5 3-8 8-8s8 3 8 8" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z" />,
    comment: <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h15Z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.5-4.5" /></>,
    flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-2-1.5-3-1-5 1-2 2-3 2-4 .5 2.5 2 5 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z" /><circle cx="12" cy="13" r="4" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'yellow' | 'ghost' }) {
  return <button className={`button button--${variant} ${className}`} {...props}>{children}</button>
}

function Avatar({ user, color, large = false }: { user: User; color: string; large?: boolean }) {
  return <div className={`avatar ${large ? 'avatar--large' : ''}`} style={{ backgroundColor: color }}>{initials(user.name)}</div>
}

function Navbar({ view, user, avatar, unread, following, navigate, logout }: {
  view: View; user: User; avatar: string; unread: number; following: number
  navigate: (view: View) => void; logout: () => void
}) {
  const [open, setOpen] = useState(false)
  const links: [View, 'home' | 'users' | 'plus' | 'bell' | 'user' | 'search'][] = [
    ['Inicio', 'home'], ['Comunidad', 'users'], ['Agregar', 'plus'], ['Notificaciones', 'bell'], ['Perfil', 'user'],
  ]
  return (
    <nav className="navbar">
      <button className="logo" onClick={() => navigate('Inicio')}>Vive<span>+</span></button>
      <div className="navlinks">
        {links.map(([label, icon]) => (
          <button key={label} className={`navlink ${view === label ? 'navlink--active' : ''}`} onClick={() => navigate(label)}>
            <span className="navicon"><Icon name={icon} />{label === 'Notificaciones' && unread > 0 && <i>{unread}</i>}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="navright">
        <button className="navsearch" onClick={() => navigate('Comunidad')}><Icon name="search" size={17} /> Buscar...</button>
        <button className="avatar-button" onClick={() => setOpen(value => !value)} aria-label="Abrir menú de usuario">
          <Avatar user={user} color={avatar} />
        </button>
        {open && (
          <div className="user-menu">
            <div><strong>{user.name}</strong><small>{following} amigos</small></div>
            <button onClick={() => { navigate('Perfil'); setOpen(false) }}>Ver perfil</button>
            <button onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </nav>
  )
}

function Footer({ toast }: { toast: (message: string) => void }) {
  return (
    <footer className="footer">
      <span className="footer-logo">Vive<span>+</span></span>
      <div>{['Sobre Vive+', 'Privacidad', 'Términos', 'Contacto'].map(item => <button key={item} onClick={() => toast(`${item}: función de demostración`)}>{item}</button>)}</div>
      <small>© 2026 Vive+ · Universidad de Ibagué</small>
    </footer>
  )
}

function Page({ children, footer = true, toast }: { children: ReactNode; footer?: boolean; toast: (message: string) => void }) {
  return <><main className="page">{children}</main>{footer && <Footer toast={toast} />}</>
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={event => event.currentTarget === event.target && onClose()}>
      <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return <div className="toast"><span>✓</span>{message}</div>
}

function Sponsored({ onOpen, compact = false }: { onOpen: () => void; compact?: boolean }) {
  return (
    <section
      className={`sponsored ${compact ? 'sponsored--compact' : ''}`}
      onClick={onOpen}
      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && onOpen()}
      role="button"
      tabIndex={0}
    >
      <span className="sponsored-label">Patrocinado</span>
      <div className="sponsored-star">☆</div>
      <h3>Reto grupal con Marca aliada</h3>
      <p>5 días de frutas y verduras frescas</p>
      <Button variant="yellow" onClick={onOpen}>Unirme</Button>
    </section>
  )
}

function RegisterView({ onRegister, onLogin }: {
  onRegister: (form: { username: string; goal: string; email: string; password: string }) => Promise<string>
  onLogin: (email: string, password: string) => Promise<string>
}) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [form, setForm] = useState({ username: '', goal: '', email: '', password: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const isRegister = mode === 'register'
  const errors = {
    username: !isRegister || /^[a-z0-9_]{3,20}$/.test(form.username) ? '' : 'Usa de 3 a 20 caracteres: minúsculas, números o _',
    goal: !isRegister || form.goal ? '' : 'Selecciona una meta',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Escribe un correo válido',
    password: form.password.length >= 6 ? '' : 'Usa al menos 6 caracteres',
  }
  const valid = Object.values(errors).every(error => !error)
  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched({ username: true, goal: true, email: true, password: true })
    if (!valid) return
    setLoading(true)
    setServerError('')
    const error = isRegister ? await onRegister(form) : await onLogin(form.email, form.password)
    if (error) { setServerError(error); setLoading(false) }
  }
  return (
    <main className="register">
      <section className="register-hero">
        <div className="bubble bubble--one" /><div className="bubble bubble--two" />
        <div className="register-copy">
          <div className="register-logo">Vive<span>+</span></div>
          <h1>Pequeños hábitos,<br />grandes cambios.</h1>
          <p>Únete a una comunidad que te acompaña a construir hábitos saludables, sin juicios.</p>
          <ul>
            {['Registro en pocos clics', 'Retos individuales y grupales', 'Apoyo de tu comunidad'].map(item => <li key={item}><span>✓</span>{item}</li>)}
          </ul>
        </div>
      </section>
      <section className="register-form-wrap">
        <form className="register-form" onSubmit={submit} noValidate>
          <h1>{isRegister ? 'Crea tu perfil' : 'Inicia sesión'}</h1>
          {isRegister && <FormControl label="Nombre de usuario" error={touched.username ? errors.username : ''}>
            <input value={form.username} onChange={event => change('username', event.target.value.toLowerCase().trim())} onBlur={() => setTouched(t => ({ ...t, username: true }))} placeholder="ej: maria_b" autoCapitalize="none" />
          </FormControl>}
          {isRegister && <FormControl label="Meta" error={touched.goal ? errors.goal : ''}>
            <select value={form.goal} onChange={event => change('goal', event.target.value)} onBlur={() => setTouched(t => ({ ...t, goal: true }))}>
              <option value="">Selecciona tu meta</option>
              <option value="bajar">Bajar de peso</option><option value="salud">Ganar salud</option>
              <option value="verdura">Comer más verdura</option><option value="ejercicio">Hacer más ejercicio</option>
            </select>
          </FormControl>}
          <FormControl label="Correo" error={touched.email ? errors.email : ''}>
            <input type="email" value={form.email} onChange={event => change('email', event.target.value)} onBlur={() => setTouched(t => ({ ...t, email: true }))} placeholder="hola@vivemas.com" />
          </FormControl>
          <FormControl label="Contraseña" error={touched.password ? errors.password : ''}>
            <div className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={event => change('password', event.target.value)} onBlur={() => setTouched(t => ({ ...t, password: true }))} placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Ver'}</button>
            </div>
          </FormControl>
          {serverError && <p className="save-hint">{serverError}</p>}
          <Button type="submit" disabled={loading}>{loading ? <><span className="spinner" />Un momento...</> : isRegister ? 'Crear cuenta' : 'Entrar'}</Button>
          <p className="signin">{isRegister ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}<button type="button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setServerError(''); setTouched({}) }}>{isRegister ? 'Inicia sesión' : 'Regístrate'}</button></p>
        </form>
      </section>
    </main>
  )
}

function FormControl({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className={`form-control ${error ? 'form-control--error' : ''}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>
}

function LikeButton({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  return (
    <button className={`like ${active ? 'like--active' : ''}`} onClick={onClick}>
      <span className={active ? 'heart-pop' : ''}><Icon name="heart" size={18} /></span><strong>{count}</strong>
    </button>
  )
}

function FeedCard({ post, mine, onLike, onComments, onDelete, onPerson }: {
  post: Post; mine: boolean; onLike: () => void; onComments: () => void; onDelete: () => void; onPerson: () => void
}) {
  return (
    <article className="feed-card">
      <header>
        <div className="feed-avatar" style={{ backgroundColor: post.avatar, cursor: 'pointer' }} onClick={onPerson}>{post.initials}</div>
        <div><strong style={{ cursor: 'pointer' }} onClick={onPerson}>{post.author}</strong> <span>{post.action}</span></div>
        <time>{post.time}</time>
      </header>
      {post.image && <img src={post.image} alt={post.description || post.kind} />}
      <div className="feed-copy">
        {post.description && <p>{post.description}</p>}
        <div className="tags">{post.tags.map((tag, index) => <span key={`${tag}-${index}`}>#{tag}</span>)}</div>
      </div>
      <footer>
        <LikeButton active={post.liked} count={post.likes} onClick={onLike} />
        <button className="comment-action" onClick={onComments}><Icon name="comment" size={18} />Comentar <span>{post.commentCount}</span></button>
        {mine && <button className="comment-action" style={{ color: '#D94848' }} onClick={onDelete}>Eliminar</button>}
      </footer>
    </article>
  )
}

function HomeView({
  user,
  streak,
  completed,
  posts,
  friends,
  challengesProgress,
  onFriends,
  onPerson,
  onDelete,
  onComplete,
  onCompleteChallengeDay,
  onLike,
  onComments,
  onChallenge,
  onPremium,
  onOpenChallengesHub,
  toast,
}: {
  user: User
  streak: number
  completed: boolean
  posts: Post[]
  friends: Friend[]
  challengesProgress: Record<string, UserChallengeProgress>
  onFriends: () => void
  onPerson: (friend: Friend) => void
  onDelete: (post: Post) => void
  onComplete: () => void
  onCompleteChallengeDay: (challenge: Challenge) => void
  onLike: (id: string) => void
  onComments: (id: string) => void
  onChallenge: () => void
  onPremium: () => void
  onOpenChallengesHub: () => void
  toast: (message: string) => void
}) {
  return (
    <Page toast={toast}>
      <div className="welcome">
        <h1>¡Hola, {user.name.split(' ')[0]}!</h1>
        <p>Un pequeño paso hoy hace una gran diferencia mañana.</p>
      </div>
      <div className="home-grid">
        <aside className="home-left">
          <section className="streak-card">
            <div><span>Tu racha</span><Icon name="flame" size={29} /></div>
            <p key={streak} className="count-up">{streak}<small>días</small></p>
            <hr />
            <span>¡Vas increíble, sigue así!</span>
          </section>

          <section className="daily-card">
            <small>RETO DE HOY</small>
            <h2>{GOAL_CHALLENGES[user.goal] || 'Camina 20 min'}</h2>
            <p>Ajustado a tu meta: {user.goal.toLowerCase()}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <Button onClick={onComplete} disabled={completed}>
                {completed ? 'Completado hoy ✓' : 'Completar reto'}
              </Button>
              <Button variant="secondary" onClick={onOpenChallengesHub} style={{ background: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                Explorar todos los retos ({CHALLENGES_CATALOG.length})
              </Button>
            </div>
          </section>
        </aside>

        <section className="feed">
          <h2>Tu comunidad</h2>
          {!posts.length && (
            <p>Aquí verás las publicaciones de tus amigos y las tuyas. Busca personas en Comunidad o usa “Agregar” para publicar la primera.</p>
          )}
          {posts.map(post => (
            <FeedCard
              key={post.id}
              post={post}
              mine={post.userId === user.id}
              onLike={() => onLike(post.id)}
              onComments={() => onComments(post.id)}
              onDelete={() => onDelete(post)}
              onPerson={() => onPerson({ id: post.userId, username: post.author })}
            />
          ))}
        </section>

        <aside className="home-right">
          <Sponsored onOpen={onChallenge} compact />
          <section className="friends-card">
            <h3>Mis amigos</h3>
            {friends.length ? (
              friends.slice(0, 5).map(f => (
                <div className="friend" key={f.id} style={{ cursor: 'pointer' }} onClick={() => onPerson(f)}>
                  <div className="feed-avatar" style={{ backgroundColor: C.blue }}>{initials(f.username)}</div>
                  <p><strong>@{f.username}</strong></p>
                </div>
              ))
            ) : (
              <p className="friends-empty-msg">Aún no tienes amigos agregados.</p>
            )}
            <div className="friends-card-action">
              <Button variant="secondary" onClick={onFriends}>Buscar amigos</Button>
            </div>
          </section>
          <button className="premium-card" onClick={onPremium}>
            <span>☆ Vive+ Premium</span>
            <p>Análisis con IA y retos exclusivos para tu estilo de vida</p>
            <b>Conocer más</b>
          </button>
        </aside>
      </div>
    </Page>
  )
}

function CommentsDrawer({ post, user, onClose, onAdded }: { post: Post; user: User; onClose: () => void; onAdded: () => void }) {
  const [text, setText] = useState('')
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [sending, setSending] = useState(false)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  useEffect(() => {
    supabase.rpc('get_comments', { pid: post.id }).then(({ data }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setComments((data ?? []).map((c: any) => ({ id: c.id, author: c.username, text: c.text }))))
  }, [post.id])
  const send = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    const { data, error } = await supabase.from('post_comments').insert({ post_id: post.id, user_id: user.id, text: value }).select('id').single()
    setSending(false)
    if (error || !data) return
    setComments(current => [...(current ?? []), { id: data.id, author: user.name, text: value }])
    setText('')
    onAdded()
  }
  return (
    <div className="drawer-overlay" onMouseDown={event => event.currentTarget === event.target && onClose()}>
      <aside className="drawer">
        <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        <h2>Comentarios</h2>
        <p className="drawer-caption">{post.author} · {post.description || post.kind}</p>
        {post.image && <img className="drawer-img" src={post.image} alt={post.description || post.kind} />}
        <div className="comments">
          {comments === null ? <p>Cargando…</p> : comments.length ? comments.map(comment => <div key={comment.id}><strong>{comment.author}</strong><p>{comment.text}</p></div>) : <p>Aún no hay comentarios. Sé la primera persona en escribir.</p>}
        </div>
        <form onSubmit={event => { event.preventDefault(); send() }}>
          <textarea value={text} maxLength={500} onChange={event => setText(event.target.value)} placeholder={`Comentar como ${user.name}...`} />
          <Button disabled={!text.trim() || sending}>Publicar comentario</Button>
        </form>
      </aside>
    </div>
  )
}

function CommunityView({
  userId,
  posts,
  friends,
  receivedRequests,
  sentRequests,
  onLike,
  onOpen,
  onPerson,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onConfirmRemoveFriend,
  onChallenge,
  toast,
}: {
  userId: string
  posts: Post[]
  friends: Friend[]
  receivedRequests: FriendRequest[]
  sentRequests: FriendRequest[]
  onLike: (id: string) => void
  onOpen: (id: string) => void
  onPerson: (friend: Friend) => void
  onSendRequest: (friend: Friend) => void
  onAcceptRequest: (req: FriendRequest) => void
  onRejectRequest: (req: FriendRequest) => void
  onConfirmRemoveFriend: (friend: Friend) => void
  onChallenge: () => void
  toast: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [people, setPeople] = useState<Friend[] | null>(null)
  const text = query.trim().replace(/^@/, '').toLowerCase()

  useEffect(() => {
    if (text.length < 2) { setPeople(null); return }
    const timer = window.setTimeout(() => {
      supabase.rpc('buscar_usuarios', { q: text }).then(({ data, error }) => {
        if (error) toast('No se pudo buscar, intenta de nuevo')
        else setPeople((data ?? []) as Friend[])
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [text])

  const isFriend = (id: string) => friends.some(friend => friend.id === id)
  const isRequestSent = (id: string) => sentRequests.some(r => r.receiverId === id && r.status === 'pending')
  const incomingReqFor = (id: string) => receivedRequests.find(r => r.senderId === id && r.status === 'pending')

  const visible = posts.filter(post => {
    const search = `${post.author} ${post.description} ${post.tags.join(' ')} ${post.kind}`.toLowerCase()
    return search.includes(text) && (filter === 'Todos' || (filter === 'Amigos' ? isFriend(post.userId) : post.kind === filter))
  })

  return (
    <Page toast={toast}>
      <div className="page-heading">
        <h1>Comunidad</h1>
        <label className="search-field">
          <Icon name="search" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Busca personas por nombre de usuario o publicaciones" />
        </label>
      </div>

      {/* Pending Incoming Friend Requests */}
      {receivedRequests.length > 0 && (
        <section className="friend-requests-card card">
          <div className="requests-heading">
            <h3>Solicitudes de amistad recibidas</h3>
            <span className="badge-count">{receivedRequests.length}</span>
          </div>
          <div className="request-list">
            {receivedRequests.map(req => (
              <div key={req.id} className="request-item">
                <div className="request-user-info">
                  <div className="feed-avatar" style={{ backgroundColor: colorOf(req.senderUsername || 'amigo') }}>
                    {initials(req.senderUsername || 'A')}
                  </div>
                  <div>
                    <strong>@{req.senderUsername}</strong>
                    <small style={{ color: 'var(--text)' }}>Te envió una solicitud de amistad</small>
                  </div>
                </div>
                <div className="request-actions">
                  <button type="button" className="button request-btn-accept" onClick={() => onAcceptRequest(req)}>
                    Aceptar
                  </button>
                  <button type="button" className="button request-btn-reject" onClick={() => onRejectRequest(req)}>
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search results */}
      {people && (
        <section className="card friends-card" style={{ marginBottom: 24 }}>
          <h3>Personas</h3>
          {people.length ? (
            people.map(f => {
              if (f.id === userId) return null
              const reqIncoming = incomingReqFor(f.id)
              return (
                <div className="friend" key={f.id}>
                  <div className="feed-avatar" style={{ backgroundColor: colorOf(f.username), cursor: 'pointer' }} onClick={() => onPerson(f)}>
                    {initials(f.username)}
                  </div>
                  <p style={{ cursor: 'pointer' }} onClick={() => onPerson(f)}><strong>@{f.username}</strong></p>
                  {isFriend(f.id) ? (
                    <Button variant="secondary" onClick={() => onConfirmRemoveFriend(f)}>Quitar</Button>
                  ) : reqIncoming ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="button request-btn-accept" style={{ padding: '0 10px', minHeight: '32px', fontSize: '11px' }} onClick={() => onAcceptRequest(reqIncoming)}>
                        Aceptar
                      </button>
                      <button type="button" className="button request-btn-reject" style={{ padding: '0 10px', minHeight: '32px', fontSize: '11px' }} onClick={() => onRejectRequest(reqIncoming)}>
                        Rechazar
                      </button>
                    </div>
                  ) : isRequestSent(f.id) ? (
                    <Button variant="secondary" disabled style={{ opacity: 0.75 }}>Solicitud enviada</Button>
                  ) : (
                    <Button onClick={() => onSendRequest(f)}>Agregar amigo</Button>
                  )}
                </div>
              )
            })
          ) : (
            <p style={{ padding: '0 18px' }}>No encontramos ese usuario.</p>
          )}
        </section>
      )}

      {friends.length > 0 && !text && (
        <div className="chips">{friends.map(f => <button key={f.id} onClick={() => onPerson(f)}>@{f.username}</button>)}</div>
      )}

      <div className="chips">
        {['Todos', 'Amigos', 'Comida', 'Ejercicio'].map(item => (
          <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      {visible.length ? (
        <div className="mosaic">
          {visible.map((post, index) => (
            <article className={`mosaic-card mosaic-card--${index % 3}`} key={post.id} onClick={() => onOpen(post.id)}>
              {post.image ? <img src={post.image} alt={post.description || post.kind} /> : <div className="noimg">{post.description || post.kind}</div>}
              <div className="mosaic-shade" />
              <header onClick={event => { event.stopPropagation(); onPerson({ id: post.userId, username: post.author }) }}>
                <div className="feed-avatar" style={{ backgroundColor: post.avatar }}>{post.initials}</div>
                <strong>{post.author}</strong>
              </header>
              <div className="mosaic-info">
                <h3>{post.kind}</h3>
                <p>{post.description}</p>
                <div onClick={event => event.stopPropagation()}>
                  <Button onClick={() => onOpen(post.id)}>Comentar ({post.commentCount})</Button>
                  <LikeButton active={post.liked} count={post.likes} onClick={() => onLike(post.id)} />
                </div>
              </div>
            </article>
          ))}
          <Sponsored onOpen={onChallenge} />
        </div>
      ) : (
        <div className="empty">
          <Icon name="search" size={36} />
          <h2>{posts.length ? 'No encontramos resultados' : 'Aún no hay publicaciones'}</h2>
          <p>{posts.length ? 'Prueba con otro nombre, etiqueta o palabra.' : 'Sé la primera persona en publicar desde “Agregar”.'}</p>
        </div>
      )}
    </Page>
  )
}

function PersonModal({
  person,
  self,
  isFriend,
  isRequestSent,
  incomingRequest,
  onClose,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onConfirmRemove,
}: {
  person: Friend
  self: boolean
  isFriend: boolean
  isRequestSent: boolean
  incomingRequest?: FriendRequest
  onClose: () => void
  onSendRequest: () => void
  onAcceptRequest: (req: FriendRequest) => void
  onRejectRequest: (req: FriendRequest) => void
  onConfirmRemove: () => void
}) {
  const [info, setInfo] = useState<{ goal: string | null; streak: number } | null | undefined>(undefined)
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    setInfo(undefined)
    supabase.rpc('perfil_amigo', { uid: person.id }).then(({ data }) => setInfo(data?.[0] ?? null))
    supabase.rpc('get_posts', { only_user: person.id }).then(({ data }) => setPosts((data ?? []).map(toPost)))
  }, [person.id, isFriend])

  return (
    <Modal title={`@${person.username}`} onClose={onClose}>
      <div className="person">
        <div className="feed-avatar" style={{ backgroundColor: colorOf(person.username) }}>{initials(person.username)}</div>
        {info === undefined ? (
          <p>Cargando…</p>
        ) : info ? (
          <>
            <p><strong>Meta:</strong> {info.goal || 'Sin meta'}</p>
            <p><strong>Racha:</strong> {info.streak} días</p>
          </>
        ) : (
          <p>Agrega a @{person.username} como amigo para ver su perfil y su racha.</p>
        )}

        {!self && (
          isFriend ? (
            <Button variant="secondary" onClick={onConfirmRemove}>Quitar de amigos</Button>
          ) : incomingRequest ? (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button type="button" className="button request-btn-accept" onClick={() => onAcceptRequest(incomingRequest)}>
                Aceptar solicitud
              </button>
              <button type="button" className="button request-btn-reject" onClick={() => onRejectRequest(incomingRequest)}>
                Rechazar
              </button>
            </div>
          ) : isRequestSent ? (
            <Button variant="secondary" disabled>Solicitud enviada</Button>
          ) : (
            <Button onClick={onSendRequest}>Agregar amigo</Button>
          )
        )}

        {info && (
          <>
            <h3>Publicaciones</h3>
            {posts.length ? (
              <div className="person-posts">
                {posts.map(post => post.image ? <img key={post.id} src={post.image} alt={post.description} /> : <div key={post.id} className="person-note">{post.description}</div>)}
              </div>
            ) : (
              <p>Aún no ha publicado nada.</p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function AddView({ user, avatar, onSaved, onCancel, onPremium, toast }: {
  user: User; avatar: string; onSaved: () => void; onCancel: () => void; onPremium: () => void; toast: (message: string) => void
}) {
  const [tab, setTab] = useState<'Comida' | 'Ejercicio'>('Comida')
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState<string[]>(['Sano'])
  const [customTags, setCustomTags] = useState<string[]>([])
  const [other, setOther] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [exercise, setExercise] = useState({ type: '', minutes: '' })
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const availableTags = [...new Set(['Sano', 'Nutritivo', 'Ejercicio', ...customTags])]

  const chooseFile = (picked?: File) => {
    if (!picked || !picked.type.startsWith('image/')) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])
  const toggleTag = (tag: string) => setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])
  const valid = tab === 'Comida'
    ? Boolean(preview)
    : Boolean(exercise.type.trim() && Number(exercise.minutes) > 0)

  const save = async () => {
    if (!valid || loading) return
    setLoading(true)
    let imagePath: string | null = null
    if (tab === 'Comida' && file) {
      const blob = await compress(file)
      imagePath = `${user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('fotos').upload(imagePath, blob, { contentType: blob.type || 'image/jpeg' })
      if (error) { toast('No se pudo subir la foto, intenta de nuevo'); setLoading(false); return }
    }
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      kind: tab,
      image_path: imagePath,
      description: description.trim() || (tab === 'Ejercicio' ? `${exercise.type} durante ${exercise.minutes} minutos` : ''),
      tags: [...new Set([...tags, ...(tab === 'Ejercicio' ? [exercise.type.trim()] : [])].filter(Boolean))],
    })
    if (error) {
      if (imagePath) await supabase.storage.from('fotos').remove([imagePath])
      toast('No se pudo publicar, intenta de nuevo'); setLoading(false); return
    }
    onSaved()
  }

  return (
    <Page toast={toast}>
      <div className="center-heading"><h1>Registra tu día</h1><p>Con pocos toques</p></div>
      <div className="tabs">{(['Comida', 'Ejercicio'] as const).map(item => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
      <section className="add-card">
        <div className="add-grid">
          {tab === 'Comida' ? (
            <div className={`dropzone ${drag ? 'dropzone--drag' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={event => { event.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); chooseFile(event.dataTransfer.files[0]) }}>
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={event => chooseFile(event.target.files?.[0])} />
              {preview ? <><img src={preview} alt="Vista previa" /><Button variant="secondary" onClick={event => { event.stopPropagation(); setPreview(''); setFile(null) }}>Quitar imagen</Button></> : <><div className="camera"><Icon name="camera" size={38} /></div><strong>Arrastra tu foto o haz clic para adjuntar</strong><span>JPG, PNG o WEBP · Se comprime sola</span><Button variant="secondary">Seleccionar archivo</Button></>}
            </div>
          ) : (
            <div className="exercise-panel">
              <div className="camera"><Icon name="flame" size={38} /></div>
              <h2>¿Cómo te moviste hoy?</h2>
              <FormControl label="Tipo de ejercicio"><input value={exercise.type} onChange={event => setExercise(current => ({ ...current, type: event.target.value }))} placeholder="Ej: correr, yoga, bicicleta" /></FormControl>
              <FormControl label="Minutos"><input type="number" min="1" value={exercise.minutes} onChange={event => setExercise(current => ({ ...current, minutes: event.target.value }))} placeholder="30" /></FormControl>
            </div>
          )}
          <div className="add-fields">
            <FormControl label="Descripción (opcional)"><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder={tab === 'Comida' ? 'Ej: Almuerzo balanceado con proteína y verduras…' : '¿Cómo te sentiste durante el ejercicio?'} /></FormControl>
            <div>
              <label className="field-title">Etiquetas</label>
              <div className="tags-picker">
                {availableTags.map((tag, index) => <button type="button" className={tags.includes(tag) ? 'active' : ''} onClick={() => toggleTag(tag)} key={`${tag}-${index}`}>{tag}</button>)}
                <button type="button" className="other-tag" onClick={() => setOther(true)}>+ Otra</button>
              </div>
              {other && (
                <form className="inline-add" onSubmit={event => { event.preventDefault(); const tag = newTag.trim(); if (tag && !availableTags.includes(tag)) { setCustomTags(current => [...current, tag]); setTags(current => [...current, tag]); setNewTag(''); setOther(false) } }}>
                  <input autoFocus value={newTag} onChange={event => setNewTag(event.target.value)} placeholder="Nueva etiqueta" /><Button>Agregar</Button>
                </form>
              )}
            </div>
            <div className="options">
              <div><span><b>☆ Analizar con IA</b><small>Detecta nutrientes automáticamente · Premium</small></span><Switch checked={false} onChange={onPremium} /></div>
              <div><span><b>Publicación pública</b><small>Aparece en Comunidad y en el feed de tus amigos</small></span></div>
            </div>
          </div>
        </div>
        {!valid && <p className="save-hint">{tab === 'Comida' ? 'Para guardar una comida, agrega una imagen.' : 'Para guardar un ejercicio, el tipo de ejercicio y los minutos son obligatorios.'}</p>}
        {/* ELIMINADO: "Cada registro suma a tu racha" */}
        <footer className="add-actions">
          <span>Comparte tu comida o ejercicio con la comunidad</span>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button onClick={save} disabled={!valid || loading}>{loading ? <><span className="spinner" />Guardando...</> : 'Guardar'}</Button>
        </footer>
      </section>
    </Page>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button className={`switch ${checked ? 'switch--on' : ''}`} onClick={onChange} aria-pressed={checked}><span /></button>
}

function NotificationsView({
  notifications,
  streak,
  receivedRequests,
  onOpen,
  onReadAll,
  onAcceptRequest,
  onRejectRequest,
  toast,
}: {
  notifications: Notification[]
  streak: number
  receivedRequests: FriendRequest[]
  onOpen: (notification: Notification) => void
  onReadAll: () => void
  onAcceptRequest: (req: FriendRequest) => void
  onRejectRequest: (req: FriendRequest) => void
  toast: (message: string) => void
}) {
  const [filter, setFilter] = useState('Todas')
  const visible = notifications.filter(item => filter === 'Todas' || item.category === filter)

  return (
    <Page toast={toast}>
      <div className="notifications-grid">
        <section>
          <div className="title-actions">
            <h1>Notificaciones</h1>
            <Button variant="ghost" onClick={onReadAll}>Marcar todas como leídas</Button>
          </div>

          {/* Incoming Friend Requests at Top of Notifications if any */}
          {receivedRequests.length > 0 && (
            <div className="friend-requests-card card" style={{ marginBottom: 20 }}>
              <div className="requests-heading">
                <h3>Solicitudes de amistad pendientes</h3>
                <span className="badge-count">{receivedRequests.length}</span>
              </div>
              <div className="request-list">
                {receivedRequests.map(req => (
                  <div key={req.id} className="request-item">
                    <div className="request-user-info">
                      <div className="feed-avatar" style={{ backgroundColor: colorOf(req.senderUsername || 'amigo') }}>
                        {initials(req.senderUsername || 'A')}
                      </div>
                      <div>
                        <strong>@{req.senderUsername}</strong>
                        <small style={{ color: 'var(--text)' }}>Te envió una solicitud</small>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button type="button" className="button request-btn-accept" onClick={() => onAcceptRequest(req)}>Aceptar</button>
                      <button type="button" className="button request-btn-reject" onClick={() => onRejectRequest(req)}>Rechazar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="chips">
            {['Todas', 'Retos', 'Me gusta', 'Comentarios', 'Amigos'].map(item => (
              <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>

          <div className="notification-list">
            {visible.map(item => (
              <button className={`notification ${item.unread ? 'notification--unread' : ''}`} onClick={() => onOpen(item)} key={item.id}>
                <span className={`notification-icon notification-icon--${item.category === 'Me gusta' ? 'like' : item.category.toLowerCase()}`}>
                  {({ Comentarios: '“', 'Me gusta': '♥', Amigos: '+' } as Record<string, string>)[item.category] ?? '✓'}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.time}</small>
                </span>
                {item.unread && <i />}
              </button>
            ))}
          </div>
        </section>

        <aside>
          <section className="streak-card">
            <div><span>Tu racha</span><Icon name="flame" size={29} /></div>
            <p>{streak}<small>días</small></p>
            <hr />
            <span>¡Vas increíble, sigue así!</span>
          </section>
          <Sponsored compact onOpen={() => toast('Descubre este reto desde Inicio')} />
        </aside>
      </div>
    </Page>
  )
}

function ProfileView({
  user,
  avatar,
  goals,
  streak,
  profile,
  weightRecords,
  onAvatar,
  onToggleGoal,
  onAddGoal,
  onEdit,
  onSaveWeightRecord,
  onDeleteWeightRecord,
  onUpdateHeight,
  onPremium,
  onLogout,
  toast,
}: {
  user: User
  avatar: string
  goals: string[]
  streak: number
  profile: Info
  weightRecords: WeightRecord[]
  onAvatar: () => void
  onToggleGoal: (goal: string) => void
  onAddGoal: (goal: string) => void
  onEdit: () => void
  onSaveWeightRecord: (weight: number, height: number, date: string, notes?: string) => Promise<void>
  onDeleteWeightRecord: (id: string, date: string) => Promise<void>
  onUpdateHeight: (height: number) => Promise<void>
  onPremium: () => void
  onLogout: () => void
  toast: (message: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [goal, setGoal] = useState('')
  const goalOptions = [...new Set([user.goal, 'Salud', 'Comer verdura', '+ ejercicio', ...goals])]

  return (
    <Page toast={toast}>
      <section className="profile-hero">
        <div className="profile-identity">
          <div>
            <Avatar user={user} color={avatar} large />
            <Button variant="secondary" onClick={onAvatar}>Cambiar avatar</Button>
          </div>
          <span>
            <h1>{user.name}</h1>
            <p>{username(user.name)}</p>
          </span>
          <Button variant="secondary" onClick={onEdit}>Editar perfil</Button>
        </div>
      </section>

      <div className="profile-grid">
        <section>
          {/* Goals Selection Card */}
          <div className="card">
            <h2>Meta principal y hábitos</h2>
            <div className="goal-chips">
              {goalOptions.map((item, index) => (
                <button className={goals.includes(item) ? 'active' : ''} onClick={() => onToggleGoal(item)} key={`${item}-${index}`}>{item}</button>
              ))}
              <button className="add-goal" onClick={() => setAdding(true)}>+ Agregar meta</button>
            </div>
            {adding && (
              <form className="inline-add" onSubmit={event => { event.preventDefault(); if (goal.trim()) { onAddGoal(goal.trim()); setGoal(''); setAdding(false) } }}>
                <input autoFocus value={goal} onChange={event => setGoal(event.target.value)} placeholder="Escribe una nueva meta" />
                <Button>Agregar</Button>
              </form>
            )}
          </div>

          {/* Daily Progress Section: Weight, Height, Auto BMI, History & Charts */}
          <DailyProgressSection
            userId={user.id}
            streak={streak}
            profile={profile}
            records={weightRecords}
            onSaveRecord={onSaveWeightRecord}
            onDeleteRecord={onDeleteWeightRecord}
            onUpdateHeight={onUpdateHeight}
            toast={toast}
          />
        </section>

        <aside>
          <div className="card info-card">
            <h2>Información personal</h2>
            {[
              ['Edad', profile.age === null ? '—' : `${profile.age} años`],
              ['Peso actual', profile.weight === null ? '—' : `${profile.weight} kg`],
              ['Altura actual', profile.height === null ? '—' : `${profile.height} m`],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <button onClick={onEdit}>Actualizar</button>
              </div>
            ))}
          </div>
          <button className="premium-card premium-card--profile" onClick={onPremium}>
            <span>☆ Vive+ Premium</span>
            <p>Lleva tus hábitos más lejos con planes personalizados, análisis con IA y retos exclusivos.</p>
            <b>Descubrir Premium</b>
          </button>
        </aside>
      </div>

      <div className="mobile-logout">
        <Button variant="secondary" onClick={onLogout}>Cerrar sesión</Button>
      </div>
    </Page>
  )
}

function App() {
  const [view, setView] = useState<View>('Crear perfil')
  const [user, setUser] = useState<User>({ id: '', name: '', email: '', goal: '' })
  const [avatar, setAvatar] = useState(C.blue)
  const [streak, setStreak] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [friends, setFriends] = useState<Friend[]>([])
  const [userId, setUserId] = useState('')
  const [booting, setBooting] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [goals, setGoals] = useState<string[]>([])
  const [profile, setProfile] = useState<Info>({ age: null, weight: null, height: null })
  const [modal, setModal] = useState<ModalName>(null)
  const [person, setPerson] = useState<Friend | null>(null)
  const [commentsPost, setCommentsPost] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const toastTimer = useRef<number | null>(null)

  // New states for Improvements
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [challengesProgress, setChallengesProgress] = useState<Record<string, UserChallengeProgress>>({})
  const [showChallengesModal, setShowChallengesModal] = useState(false)

  // Custom Delete Confirmations
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null)
  const [isDeletingPost, setIsDeletingPost] = useState(false)
  const [isRemovingFriend, setIsRemovingFriend] = useState(false)

  const toast = (message: string) => {
    setToastMessage(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 3000)
  }
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const unread = notifications.filter(item => item.unread).length
  const activePost = posts.find(post => post.id === commentsPost)
  const feed = posts.filter(post => post.userId === userId || friends.some(friend => friend.id === post.userId))

  const loadPosts = async () => {
    const { data } = await supabase.rpc('get_posts')
    setPosts((data ?? []).map(toPost))
  }

  const loadWeightRecordsData = async (uid: string) => {
    const recs = await fetchWeightRecords(uid)
    setWeightRecords(recs)
  }

  const loadRequestsData = async (uid: string) => {
    const { received, sent } = await fetchFriendRequests(uid)
    setReceivedRequests(received)
    setSentRequests(sent)
  }

  const loadChallengesData = (uid: string) => {
    const p = getUserChallengesProgress(uid)
    setChallengesProgress(p)
  }

  const enter = async (id: string, email: string) => {
    const { data: p } = await supabase.from('profiles').select('username, goal, age, weight, height, streak, last_completed').eq('id', id).single()
    if (!p) return 'No pudimos cargar tu perfil. Intenta de nuevo.'
    const { data: list } = await supabase.rpc('mis_amigos')
    const done = p.last_completed === day()
    const activeStreak = done || p.last_completed === day(-1) ? p.streak : 0

    setUserId(id)
    setUser({ id, name: p.username, email, goal: p.goal ?? '' })
    setGoals(p.goal ? [p.goal] : [])
    setProfile({ age: p.age, weight: p.weight, height: p.height })
    setStreak(activeStreak)
    setCompleted(done)
    setFriends((list ?? []) as Friend[])

    // Load new modules
    await Promise.all([
      loadPosts(),
      loadWeightRecordsData(id),
      loadRequestsData(id),
    ])
    loadChallengesData(id)

    navigate('Inicio')
    return ''
  }

  const register = async (form: { username: string; goal: string; email: string; password: string }) => {
    const { data: free, error: checkError } = await supabase.rpc('username_disponible', { nombre: form.username })
    if (checkError) return 'No pudimos conectar con el servidor. Intenta de nuevo.'
    if (!free) return 'Ese nombre de usuario ya está en uso.'
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { username: form.username, goal: GOAL_LABELS[form.goal] } },
    })
    if (error) return error.message
    if (!data.session || !data.user) return 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.'
    return enter(data.user.id, form.email)
  }

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return 'Correo o contraseña incorrectos.'
    return enter(data.user.id, email)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await enter(data.session.user.id, data.session.user.email ?? '')
      setBooting(false)
    })
  }, [])

  const loadFriends = async () => {
    const { data } = await supabase.rpc('mis_amigos')
    if (data) setFriends(data as Friend[])
  }

  const loadNotifications = async () => {
    const { data } = await supabase.from('notifications').select('id, category, title, destination, unread, created_at').order('created_at', { ascending: false }).limit(50)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNotifications((data ?? []).map((n: any) => ({
      id: String(n.id),
      category: n.category,
      title: n.title,
      time: ago(n.created_at),
      unread: n.unread,
      destination: n.destination as View,
    })))
  }

  // Real-time synchronization for notifications, friends and requests
  useEffect(() => {
    if (!userId) return
    loadNotifications()
    const notifsChannel = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        loadNotifications()
        loadFriends()
      })
      .subscribe()

    // Realtime broadcast channel for friend requests
    const requestsChannel = supabase.channel('friend-requests-sync')
      .on('broadcast', { event: 'request_sent' }, (payload: any) => {
        if (payload?.payload?.receiverId === userId) {
          loadRequestsData(userId)
          loadNotifications()
          toast(`¡Nueva solicitud de amistad de @${payload.payload.senderUsername}!`)
        }
      })
      .on('broadcast', { event: 'request_accepted' }, (payload: any) => {
        if (payload?.payload?.senderId === userId || payload?.payload?.receiverId === userId) {
          loadFriends()
          loadRequestsData(userId)
          toast(`¡@${payload.payload.senderUsername} aceptó tu solicitud de amistad!`)
        }
      })
      .subscribe()

    const timer = window.setInterval(() => {
      loadNotifications()
      loadFriends()
      loadRequestsData(userId)
    }, 45000)

    return () => {
      window.clearInterval(timer)
      supabase.removeChannel(notifsChannel)
      supabase.removeChannel(requestsChannel)
    }
  }, [userId])

  const readAll = () => {
    setNotifications(current => current.map(item => ({ ...item, unread: false })))
    supabase.from('notifications').update({ unread: false }).eq('user_id', userId).eq('unread', true).then(() => {})
  }

  const closeModal = () => {
    if (modal === 'celebration' && !completed) {
      const next = streak + 1
      setCompleted(true)
      setStreak(next)
      supabase.from('profiles').update({ streak: next, last_completed: day() }).eq('id', userId).then(({ error }) => {
        if (error) toast('No se pudo guardar tu racha')
        else loadNotifications()
      })
    }
    setModal(null)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUserId('')
    setView('Crear perfil')
    setUser({ id: '', name: '', email: '', goal: '' })
    setAvatar(C.blue)
    setStreak(0)
    setCompleted(false)
    setPosts([])
    setFriends([])
    setNotifications([])
    setGoals([])
    setProfile({ age: null, weight: null, height: null })
    setWeightRecords([])
    setReceivedRequests([])
    setSentRequests([])
    setModal(null)
    setCommentsPost('')
    setToastMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleLike = async (id: string) => {
    const post = posts.find(item => item.id === id)
    if (!post) return
    const next = !post.liked
    setPosts(current => current.map(item => item.id === id ? { ...item, liked: next, likes: item.likes + (next ? 1 : -1) } : item))
    const { error } = next
      ? await supabase.from('post_likes').insert({ post_id: id, user_id: userId })
      : await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', userId)
    if (error) { toast('No se pudo guardar tu me gusta'); loadPosts() }
  }

  // Confirm and delete post (Punto 2)
  const executeDeletePost = async () => {
    if (!postToDelete) return
    setIsDeletingPost(true)
    const { error } = await supabase.from('posts').delete().eq('id', postToDelete.id)
    setIsDeletingPost(false)
    if (error) {
      toast('No se pudo eliminar la publicación.')
      return
    }
    if (postToDelete.imagePath) {
      supabase.storage.from('fotos').remove([postToDelete.imagePath])
    }
    setPosts(current => current.filter(item => item.id !== postToDelete.id))
    setPostToDelete(null)
    toast('Publicación eliminada correctamente.')
  }

  // Confirm and remove friend (Punto 2)
  const executeRemoveFriend = async () => {
    if (!friendToRemove) return
    setIsRemovingFriend(true)
    const { error } = await supabase.from('friends').delete().eq('user_id', userId).eq('friend_id', friendToRemove.id)
    setIsRemovingFriend(false)
    if (error) {
      toast('No se pudo quitar al amigo.')
      return
    }
    setFriends(current => current.filter(item => item.id !== friendToRemove.id))
    if (person && person.id === friendToRemove.id) {
      setPerson(null)
    }
    toast(`Dejaste de ser amigo de @${friendToRemove.username}.`)
    setFriendToRemove(null)
  }

  // Friend Request System (Punto 4)
  const handleSendFriendRequest = async (target: Friend) => {
    const res = await sendFriendRequest(userId, user.name, target.id, target.username)
    if (res.success && res.request) {
      setSentRequests(prev => [res.request!, ...prev])
      toast(`Solicitud de amistad enviada a @${target.username}.`)
    } else {
      toast(res.error || 'No se pudo enviar la solicitud.')
    }
  }

  const handleAcceptFriendRequest = async (req: FriendRequest) => {
    const res = await acceptFriendRequest(req.id, req.senderId, userId, req.senderUsername)
    if (res.success) {
      // Add mutual friend immediately
      setFriends(prev => [...prev, { id: req.senderId, username: req.senderUsername }])
      setReceivedRequests(prev => prev.filter(r => r.id !== req.id))
      toast(`¡Ahora eres amigo de @${req.senderUsername}!`)
      loadFriends()
    } else {
      toast(res.error || 'Error al aceptar la solicitud.')
    }
  }

  const handleRejectFriendRequest = async (req: FriendRequest) => {
    await rejectFriendRequest(req.id, req.senderId, userId)
    setReceivedRequests(prev => prev.filter(r => r.id !== req.id))
    toast('Solicitud rechazada.')
  }

  // Daily Progress Record System (Punto 6)
  const handleSaveWeightRecord = async (
    weight: number,
    height: number,
    date: string,
    notes?: string
  ) => {
    const res = await saveWeightRecord(userId, weight, height, date, notes)
    if (res.success) {
      setProfile(curr => ({ ...curr, weight, height }))
      await loadWeightRecordsData(userId)
    }
  }

  const handleDeleteWeightRecord = async (id: string, date: string) => {
    await deleteWeightRecord(userId, id, date)
    await loadWeightRecordsData(userId)
  }

  const handleUpdateHeight = async (height: number) => {
    const { error } = await supabase.from('profiles').update({ height }).eq('id', userId)
    if (!error) {
      setProfile(curr => ({ ...curr, height }))
    }
  }

  // Challenge completion logic (Punto 1 y 7)
  const handleCompleteChallengeDay = async (challenge: Challenge) => {
    const today = day()
    const result = saveUserChallengeProgress(userId, challenge.id, challenge.totalDays, today)
    setChallengesProgress(getUserChallengesProgress(userId))

    // If today's challenge was not marked yet, mark daily completed and increment streak
    if (!completed) {
      const nextStreak = streak + 1
      setCompleted(true)
      setStreak(nextStreak)
      await supabase.from('profiles').update({ streak: nextStreak, last_completed: today }).eq('id', userId)
      setModal('celebration')
    } else {
      toast(
        result.completed
          ? `¡Felicidades! Completaste el reto "${challenge.title}" 🏆`
          : `¡Día registrado en "${challenge.title}"! (${result.daysCompleted}/${challenge.totalDays})`
      )
    }
  }

  const selectNotification = (item: Notification) => {
    setNotifications(current => current.map(n => n.id === item.id ? { ...n, unread: false } : n))
    supabase.from('notifications').update({ unread: false }).eq('id', Number(item.id)).then(() => {})
    navigate(item.destination)
  }

  if (booting) return <div className="app"><p style={{ padding: 40, textAlign: 'center' }}>Cargando…</p></div>

  return (
    <div className="app">
      {view !== 'Crear perfil' && (
        <Navbar view={view} user={user} avatar={avatar} unread={unread} following={friends.length} navigate={navigate} logout={logout} />
      )}

      <div className="view-transition" key={view}>
        {view === 'Crear perfil' && <RegisterView onRegister={register} onLogin={login} />}

        {view === 'Inicio' && (
          <HomeView
            user={user}
            streak={streak}
            completed={completed}
            posts={feed}
            friends={friends}
            challengesProgress={challengesProgress}
            onFriends={() => navigate('Comunidad')}
            onPerson={setPerson}
            onDelete={post => setPostToDelete(post)}
            onComplete={() => !completed && setModal('celebration')}
            onCompleteChallengeDay={handleCompleteChallengeDay}
            onLike={toggleLike}
            onComments={setCommentsPost}
            onChallenge={() => setModal('challenge')}
            onPremium={() => setModal('premium')}
            onOpenChallengesHub={() => setShowChallengesModal(true)}
            toast={toast}
          />
        )}

        {view === 'Comunidad' && (
          <CommunityView
            userId={userId}
            posts={posts}
            friends={friends}
            receivedRequests={receivedRequests}
            sentRequests={sentRequests}
            onLike={toggleLike}
            onOpen={setCommentsPost}
            onPerson={setPerson}
            onSendRequest={handleSendFriendRequest}
            onAcceptRequest={handleAcceptFriendRequest}
            onRejectRequest={handleRejectFriendRequest}
            onConfirmRemoveFriend={f => setFriendToRemove(f)}
            onChallenge={() => setModal('challenge')}
            toast={toast}
          />
        )}

        {view === 'Agregar' && (
          <AddView
            user={user}
            avatar={avatar}
            onSaved={async () => { await loadPosts(); navigate('Inicio'); toast('¡Publicado!') }}
            onCancel={() => navigate('Inicio')}
            onPremium={() => setModal('premium')}
            toast={toast}
          />
        )}

        {view === 'Notificaciones' && (
          <NotificationsView
            notifications={notifications}
            streak={streak}
            receivedRequests={receivedRequests}
            onOpen={selectNotification}
            onReadAll={readAll}
            onAcceptRequest={handleAcceptFriendRequest}
            onRejectRequest={handleRejectFriendRequest}
            toast={toast}
          />
        )}

        {view === 'Perfil' && (
          <ProfileView
            user={user}
            avatar={avatar}
            goals={goals}
            streak={streak}
            profile={profile}
            weightRecords={weightRecords}
            onAvatar={() => setModal('avatar')}
            onToggleGoal={goal => setGoals(current => current.includes(goal) ? current.filter(item => item !== goal) : [...current, goal])}
            onAddGoal={goal => setGoals(current => current.includes(goal) ? current : [...current, goal])}
            onEdit={() => setModal('edit')}
            onSaveWeightRecord={handleSaveWeightRecord}
            onDeleteWeightRecord={handleDeleteWeightRecord}
            onUpdateHeight={handleUpdateHeight}
            onPremium={() => setModal('premium')}
            onLogout={logout}
            toast={toast}
          />
        )}
      </div>

      {/* Floating Accessibility Widget (Punto 3) */}
      <AccessibilityWidget />

      {/* Drawer for Comments */}
      {activePost && (
        <CommentsDrawer
          post={activePost}
          user={user}
          onClose={() => setCommentsPost('')}
          onAdded={() => setPosts(current => current.map(p => p.id === activePost.id ? { ...p, commentCount: p.commentCount + 1 } : p))}
        />
      )}

      {/* Person Profile Modal */}
      {person && (
        <PersonModal
          person={person}
          self={person.id === userId}
          isFriend={friends.some(friend => friend.id === person.id)}
          isRequestSent={sentRequests.some(r => r.receiverId === person.id && r.status === 'pending')}
          incomingRequest={receivedRequests.find(r => r.senderId === person.id && r.status === 'pending')}
          onClose={() => setPerson(null)}
          onSendRequest={() => handleSendFriendRequest(person)}
          onAcceptRequest={req => handleAcceptFriendRequest(req)}
          onRejectRequest={req => handleRejectFriendRequest(req)}
          onConfirmRemove={() => setFriendToRemove(person)}
        />
      )}

      {/* Standard Modals */}
      {modal === 'celebration' && (
        <Modal title="¡Reto completado!" onClose={closeModal}>
          <div className="celebration">
            <div className="confetti">{Array.from({ length: 18 }).map((_, index) => <i key={index} />)}</div>
            <div className="celebration-icon">✓</div>
            <p>Tu racha sube a <strong>{streak + (completed ? 0 : 1)} días</strong></p>
            <Button onClick={closeModal}>¡Genial!</Button>
          </div>
        </Modal>
      )}

      {modal === 'challenge' && (
        <Modal title="Reto grupal: 5 días frescos" onClose={closeModal}>
          <div className="modal-copy">
            <span className="sponsored-label">Patrocinado</span>
            <p>Comparte frutas y verduras con la comunidad durante cinco días. Recibirás ideas sencillas y acompañamiento diario.</p>
            <ul>
              <li>Una acción saludable al día</li>
              <li>Apoyo de la comunidad</li>
              <li>Insignia al completar</li>
            </ul>
            <Button variant="yellow" onClick={() => { closeModal(); toast('¡Te uniste al reto!') }}>Unirme al reto</Button>
          </div>
        </Modal>
      )}

      {modal === 'premium' && (
        <Modal title="Vive+ Premium" onClose={closeModal}>
          <div className="modal-copy">
            <p>Potencia tus hábitos con herramientas creadas para acompañarte.</p>
            <ul>
              <li>Análisis de comidas con IA</li>
              <li>Una experiencia sin anuncios</li>
              <li>Retos exclusivos y planes personalizados</li>
            </ul>
            <Button variant="yellow" onClick={() => { closeModal(); toast('Función de demostración') }}>Probar Premium</Button>
          </div>
        </Modal>
      )}

      {modal === 'avatar' && (
        <Modal title="Elige tu avatar" onClose={closeModal}>
          <div className="avatar-options">
            {[C.blue, C.green, C.yellow, C.navy, '#8B6BB5', '#E57A6F'].map(color => (
              <button key={color} style={{ backgroundColor: color }} onClick={() => { setAvatar(color); closeModal() }}>
                {initials(user.name)}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'edit' && (
        <EditProfile
          profile={profile}
          onClose={closeModal}
          onSave={async values => {
            const { error } = await supabase.from('profiles').update(values).eq('id', userId)
            if (error) { toast('No se pudo guardar'); return }
            setProfile(values)
            closeModal()
            toast('Perfil actualizado')
          }}
        />
      )}

      {/* Challenges Explorer Modal (Punto 7) */}
      {showChallengesModal && (
        <Modal title="Centro de Retos Vive+" onClose={() => setShowChallengesModal(false)} wide>
          <ChallengesSection
            userGoal={user.goal}
            streak={streak}
            progressMap={challengesProgress}
            todayCompleted={completed}
            onCompleteChallengeDay={handleCompleteChallengeDay}
            toast={toast}
          />
        </Modal>
      )}

      {/* Custom Confirmation Modal for Deleting Posts (Punto 2) */}
      <ConfirmModal
        isOpen={Boolean(postToDelete)}
        title="¿Eliminar esta publicación?"
        message="Esta publicación se eliminará de forma permanente de tu feed y de la comunidad. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={isDeletingPost}
        onConfirm={executeDeletePost}
        onCancel={() => setPostToDelete(null)}
      />

      {/* Custom Confirmation Modal for Removing Friends (Punto 2) */}
      <ConfirmModal
        isOpen={Boolean(friendToRemove)}
        title="¿Quitar de amigos?"
        message={`¿Estás seguro de que deseas eliminar a @${friendToRemove?.username} de tu lista de amigos? Dejarán de ver sus publicaciones mutuamente.`}
        confirmText="Quitar amigo"
        cancelText="Cancelar"
        loading={isRemovingFriend}
        onConfirm={executeRemoveFriend}
        onCancel={() => setFriendToRemove(null)}
      />

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

function EditProfile({ profile, onClose, onSave }: { profile: Info; onClose: () => void; onSave: (values: { age: number; weight: number; height: number }) => void | Promise<void> }) {
  const [values, setValues] = useState({ age: String(profile.age ?? ''), weight: String(profile.weight ?? ''), height: String(profile.height ?? '') })
  const valid = Number(values.age) >= 18 && Number(values.age) <= 100 && Number(values.weight) > 20 && Number(values.weight) < 300 && Number(values.height) > 1 && Number(values.height) < 2.5
  return (
    <Modal title="Editar perfil" onClose={onClose}>
      <form className="edit-form" onSubmit={event => { event.preventDefault(); if (valid) onSave({ age: Number(values.age), weight: Number(values.weight), height: Number(values.height) }) }}>
        <FormControl label="Edad">
          <input type="number" min="18" max="100" value={values.age} onChange={event => setValues(current => ({ ...current, age: event.target.value }))} />
        </FormControl>
        <FormControl label="Peso (kg)">
          <input type="number" min="20" max="300" value={values.weight} onChange={event => setValues(current => ({ ...current, weight: event.target.value }))} />
        </FormControl>
        <FormControl label="Altura (m)">
          <input type="number" min="1" max="2.5" step=".01" value={values.height} onChange={event => setValues(current => ({ ...current, height: event.target.value }))} />
        </FormControl>
        {!valid && <p className="save-hint">Revisa que todos los valores sean válidos.</p>}
        <Button disabled={!valid}>Guardar cambios</Button>
      </form>
    </Modal>
  )
}

export default App
