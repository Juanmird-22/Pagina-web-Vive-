import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

type View = 'Crear perfil' | 'Inicio' | 'Comunidad' | 'Agregar' | 'Notificaciones' | 'Perfil'
type ModalName = 'celebration' | 'challenge' | 'premium' | 'avatar' | 'edit' | 'community' | null
type User = { name: string; email: string; goal: string }
type Comment = { id: number; author: string; text: string }
type Post = {
  id: string
  author: string
  initials: string
  avatar: string
  action: string
  time: string
  description: string
  image?: string
  tags: string[]
  likes: number
  comments: Comment[]
}
type Notification = {
  id: string
  category: 'Retos' | 'Comentarios' | 'Meta'
  title: string
  time: string
  unread: boolean
  destination: View
}

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

const INITIAL_POSTS: Post[] = [
  {
    id: 'post1', author: 'Iván', initials: 'IV', avatar: C.blue, action: 'compartió su reto',
    time: 'hace 12 min', description: 'Almuerzo balanceado para seguir sumando hábitos.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&h=520&fit=crop&auto=format',
    tags: ['Sano', 'Nutritivo'], likes: 4,
    comments: [{ id: 1, author: 'Ailin', text: '¡Se ve delicioso!' }],
  },
  {
    id: 'post2', author: 'Ailin', initials: 'AI', avatar: C.green, action: 'completó su reto',
    time: 'hace 1 h', description: 'Una caminata tranquila también cuenta.',
    image: 'https://images.unsplash.com/photo-1520206444322-d2df0dd4e78e?w=900&h=520&fit=crop&auto=format',
    tags: ['Ejercicio'], likes: 11,
    comments: [{ id: 1, author: 'Sofía', text: '¡Qué buen plan!' }],
  },
  {
    id: 'post3', author: 'Iván', initials: 'IV', avatar: C.blue, action: 'se unió a un reto grupal',
    time: 'hace 3 h', description: 'Reto 5 días sin azúcar', tags: ['Retos'], likes: 2, comments: [],
  },
]

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'challenge', category: 'Retos', title: 'Nuevo reto: camina 20 min hoy', time: 'hace 5 min', unread: true, destination: 'Inicio' },
  { id: 'comment', category: 'Comentarios', title: 'Ailin comentó en tu foto: ¡Se ve delicioso!', time: 'hace 1 h', unread: true, destination: 'Comunidad' },
  { id: 'completed', category: 'Retos', title: '¡Completaste el reto! Tu racha sube a 10 días', time: 'hace 3 h', unread: false, destination: 'Inicio' },
  { id: 'goal', category: 'Meta', title: 'Añade otra meta a tu vida', time: 'hace 1 día', unread: false, destination: 'Perfil' },
]

const COMMUNITY = [
  { id: 'c1', author: 'María R.', initials: 'MR', avatar: C.yellow, title: 'Ensalada de la semana', text: 'Una idea fácil, fresca y llena de color.', tag: 'Rutinas', likes: 18, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=720&fit=crop&auto=format' },
  { id: 'c2', author: 'Carlos M.', initials: 'CM', avatar: C.blue, title: 'Yoga grupal al aire libre', text: 'Nos reunimos los sábados al atardecer.', tag: 'Amigos', likes: 24, image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=560&fit=crop&auto=format' },
  { id: 'c3', author: 'Ailin V.', initials: 'AV', avatar: C.green, title: 'Verduras frescas hoy', text: 'Mi meta es agregar más verde al plato.', tag: 'Rutinas', likes: 13, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=560&fit=crop&auto=format' },
  { id: 'c4', author: 'Luis T.', initials: 'LT', avatar: C.blue, title: 'Desayuno energético', text: 'Granola, fruta y yogur para comenzar.', tag: 'Feed', likes: 31, image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&h=720&fit=crop&auto=format' },
  { id: 'c5', author: 'Sofía C.', initials: 'SC', avatar: C.green, title: 'Carrera del domingo', text: 'Cinco kilómetros, paso a paso.', tag: 'Retos', likes: 20, image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=720&fit=crop&auto=format' },
  { id: 'c6', author: 'Andrea P.', initials: 'AP', avatar: C.yellow, title: 'Merienda tropical', text: 'Fruta fresca para compartir.', tag: 'Feed', likes: 9, image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&h=560&fit=crop&auto=format' },
]

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'V+'
}

function username(name: string) {
  return `@${name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}`
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
  const links: [View, 'home' | 'users' | 'plus' | 'bell' | 'user'][] = [
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
            <div><strong>{user.name}</strong><small>{following} seguidos</small></div>
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

function RegisterView({ onRegister, onDemo }: { onRegister: (user: User) => void; onDemo: () => void }) {
  const [form, setForm] = useState({ name: '', goal: '', email: '', password: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const errors = {
    name: form.name.trim() ? '' : 'El nombre es obligatorio',
    goal: form.goal ? '' : 'Selecciona una meta',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Escribe un correo válido',
    password: form.password.length >= 6 ? '' : 'Usa al menos 6 caracteres',
  }
  const valid = Object.values(errors).every(error => !error)
  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched({ name: true, goal: true, email: true, password: true })
    if (!valid) return
    setLoading(true)
    window.setTimeout(() => onRegister({ name: form.name.trim(), email: form.email, goal: GOAL_LABELS[form.goal] }), 1000)
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
          <h1>Crea tu perfil</h1>
          <FormControl label="Nombre" error={touched.name ? errors.name : ''}>
            <input value={form.name} onChange={event => change('name', event.target.value)} onBlur={() => setTouched(t => ({ ...t, name: true }))} placeholder="Tu nombre completo" />
          </FormControl>
          <FormControl label="Meta" error={touched.goal ? errors.goal : ''}>
            <select value={form.goal} onChange={event => change('goal', event.target.value)} onBlur={() => setTouched(t => ({ ...t, goal: true }))}>
              <option value="">Selecciona tu meta</option>
              <option value="bajar">Bajar de peso</option><option value="salud">Ganar salud</option>
              <option value="verdura">Comer más verdura</option><option value="ejercicio">Hacer más ejercicio</option>
            </select>
          </FormControl>
          <FormControl label="Correo" error={touched.email ? errors.email : ''}>
            <input type="email" value={form.email} onChange={event => change('email', event.target.value)} onBlur={() => setTouched(t => ({ ...t, email: true }))} placeholder="hola@vivemas.com" />
          </FormControl>
          <FormControl label="Contraseña" error={touched.password ? errors.password : ''}>
            <div className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={event => change('password', event.target.value)} onBlur={() => setTouched(t => ({ ...t, password: true }))} placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Ver'}</button>
            </div>
          </FormControl>
          <Button type="submit" disabled={!valid || loading}>{loading ? <><span className="spinner" />Creando cuenta...</> : 'Crear cuenta'}</Button>
          <p className="signin">¿Ya tienes cuenta? <button type="button" onClick={onDemo}>Inicia sesión</button></p>
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

function FeedCard({ post, liked, onLike, onComments }: { post: Post; liked: boolean; onLike: () => void; onComments: () => void }) {
  return (
    <article className="feed-card">
      <header>
        <div className="feed-avatar" style={{ backgroundColor: post.avatar }}>{post.initials}</div>
        <div><strong>{post.author}</strong> <span>{post.action}</span></div>
        <time>{post.time}</time>
      </header>
      {post.image && <img src={post.image} alt={post.description} />}
      <div className="feed-copy">
        {post.description && <p>{post.description}</p>}
        <div className="tags">{post.tags.map((tag, index) => <span key={`${tag}-${index}`}>#{tag}</span>)}</div>
      </div>
      <footer>
        <LikeButton active={liked} count={post.likes + (liked ? 1 : 0)} onClick={onLike} />
        <button className="comment-action" onClick={onComments}><Icon name="comment" size={18} />Comentar <span>{post.comments.length}</span></button>
      </footer>
    </article>
  )
}

function HomeView({ user, streak, completed, posts, liked, following, onComplete, onLike, onComments, onFollow, onChallenge, onPremium, toast }: {
  user: User; streak: number; completed: boolean; posts: Post[]; liked: Set<string>; following: Set<string>
  onComplete: () => void; onLike: (id: string) => void; onComments: (id: string) => void
  onFollow: (name: string) => void; onChallenge: () => void; onPremium: () => void; toast: (message: string) => void
}) {
  const friends = [
    ['MR', 'María Rodríguez', '3 hábitos en común', C.yellow],
    ['JP', 'Julián Pérez', 'Racha de 7 días', C.green],
    ['SC', 'Sofía Castillo', 'Top comunidad', C.blue],
  ]
  return (
    <Page toast={toast}>
      <div className="welcome"><h1>¡Hola, {user.name.split(' ')[0]}!</h1><p>Un pequeño paso hoy hace una gran diferencia mañana.</p></div>
      <div className="home-grid">
        <aside className="home-left">
          <section className="streak-card"><div><span>Tu racha</span><Icon name="flame" size={29} /></div><p key={streak} className="count-up">{streak}<small>días</small></p><hr /><span>¡Vas increíble, sigue así!</span></section>
          <section className="daily-card"><small>RETO DE HOY</small><h2>{GOAL_CHALLENGES[user.goal] || 'Camina 20 min'}</h2><p>Ajustado a tu meta: {user.goal.toLowerCase()}</p><Button onClick={onComplete} disabled={completed}>{completed ? 'Completado ✓' : 'Completar'}</Button></section>
        </aside>
        <section className="feed"><h2>Tu comunidad</h2>{posts.map(post => <FeedCard key={post.id} post={post} liked={liked.has(post.id)} onLike={() => onLike(post.id)} onComments={() => onComments(post.id)} />)}</section>
        <aside className="home-right">
          <Sponsored onOpen={onChallenge} compact />
          <section className="friends-card"><h3>Amigos sugeridos</h3>{friends.map(([ini, name, sub, color]) => <div className="friend" key={name}><div className="feed-avatar" style={{ backgroundColor: color }}>{ini}</div><p><strong>{name}</strong><small>{sub}</small></p><Button variant="secondary" onClick={() => onFollow(name)}>{following.has(name) ? 'Siguiendo ✓' : 'Seguir'}</Button></div>)}</section>
          <button className="premium-card" onClick={onPremium}><span>☆ Vive+ Premium</span><p>Análisis con IA y retos exclusivos para tu estilo de vida</p><b>Conocer más</b></button>
        </aside>
      </div>
    </Page>
  )
}

function CommentsDrawer({ post, user, onClose, onAdd }: { post: Post; user: User; onClose: () => void; onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="drawer-overlay" onMouseDown={event => event.currentTarget === event.target && onClose()}>
      <aside className="drawer">
        <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        <h2>Comentarios</h2>
        <p className="drawer-caption">{post.author} · {post.description}</p>
        <div className="comments">
          {post.comments.length ? post.comments.map(comment => <div key={comment.id}><strong>{comment.author}</strong><p>{comment.text}</p></div>) : <p>Aún no hay comentarios. Sé la primera persona en escribir.</p>}
        </div>
        <form onSubmit={event => { event.preventDefault(); if (text.trim()) { onAdd(text.trim()); setText('') } }}>
          <textarea value={text} onChange={event => setText(event.target.value)} placeholder={`Comentar como ${user.name}...`} />
          <Button disabled={!text.trim()}>Publicar comentario</Button>
        </form>
      </aside>
    </div>
  )
}

function CommunityView({ liked, following, onLike, onFollow, onOpen, onChallenge, toast }: {
  liked: Set<string>; following: Set<string>; onLike: (id: string) => void; onFollow: (name: string) => void
  onOpen: (id: string) => void; onChallenge: () => void; toast: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Feed')
  const visible = COMMUNITY.filter(card => {
    const search = `${card.author} ${card.title} ${card.text} ${card.tag}`.toLowerCase()
    return search.includes(query.toLowerCase()) && (filter === 'Feed' || card.tag === filter)
  })
  return (
    <Page toast={toast}>
      <div className="page-heading"><h1>Comunidad</h1><label className="search-field"><Icon name="search" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Busca personas, rutinas o retos" /></label></div>
      <div className="chips">{['Feed', 'Rutinas', 'Amigos', 'Retos'].map(item => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {visible.length ? <div className="mosaic">
        {visible.map((card, index) => <article className={`mosaic-card mosaic-card--${index % 3}`} key={card.id} onClick={() => onOpen(card.id)}>
          <img src={card.image} alt={card.title} /><div className="mosaic-shade" />
          <header><div className="feed-avatar" style={{ backgroundColor: card.avatar }}>{card.initials}</div><strong>{card.author}</strong></header>
          <div className="mosaic-info"><h3>{card.title}</h3><p>{card.text}</p><div onClick={event => event.stopPropagation()}><Button onClick={() => onFollow(card.author)}>{following.has(card.author) ? 'Siguiendo ✓' : 'Seguir'}</Button><LikeButton active={liked.has(card.id)} count={card.likes + (liked.has(card.id) ? 1 : 0)} onClick={() => onLike(card.id)} /></div></div>
        </article>)}
        <Sponsored onOpen={onChallenge} />
      </div> : <div className="empty"><Icon name="search" size={36} /><h2>No encontramos resultados</h2><p>Prueba con otro nombre, etiqueta o palabra.</p></div>}
    </Page>
  )
}

function AddView({ user, avatar, onSave, onCancel, onPremium, toast }: {
  user: User; avatar: string; onSave: (post: Post, share: boolean) => void; onCancel: () => void; onPremium: () => void; toast: (message: string) => void
}) {
  const [tab, setTab] = useState<'Comida' | 'Ejercicio'>('Comida')
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState('')
  const [tags, setTags] = useState<string[]>(['Sano'])
  const [customTags, setCustomTags] = useState<string[]>([])
  const [other, setOther] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [share, setShare] = useState(true)
  const [exercise, setExercise] = useState({ type: '', minutes: '' })
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const availableTags = [...new Set(['Sano', 'Nutritivo', 'Ejercicio', ...customTags])]
  const chooseFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
  }
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])
  const toggleTag = (tag: string) => setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])
  const valid = tab === 'Comida'
    ? Boolean(preview)
    : Boolean(exercise.type.trim() && Number(exercise.minutes) > 0)
  const save = () => {
    if (!valid) return
    setLoading(true)
    window.setTimeout(() => onSave({
      id: `user-${Date.now()}`, author: user.name, initials: initials(user.name), avatar, action: tab === 'Comida' ? 'compartió su registro' : 'completó un ejercicio',
      time: 'hace un momento', description: description.trim() || `${exercise.type} durante ${exercise.minutes} minutos`,
      image: tab === 'Comida' ? preview : undefined, tags: [...new Set([...tags, ...(tab === 'Ejercicio' ? [exercise.type.trim()] : [])].filter(Boolean))], likes: 0, comments: [],
    }, share), 1000)
  }
  return (
    <Page toast={toast}>
      <div className="center-heading"><h1>Registra tu día</h1><p>Con pocos toques</p></div>
      <div className="tabs">{(['Comida', 'Ejercicio'] as const).map(item => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
      <section className="add-card">
        <div className="add-grid">
          {tab === 'Comida' ? <div className={`dropzone ${drag ? 'dropzone--drag' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={event => { event.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); chooseFile(event.dataTransfer.files[0]) }}>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={event => chooseFile(event.target.files?.[0])} />
            {preview ? <><img src={preview} alt="Vista previa" /><Button variant="secondary" onClick={event => { event.stopPropagation(); setPreview('') }}>Quitar imagen</Button></> : <><div className="camera"><Icon name="camera" size={38} /></div><strong>Arrastra tu foto o haz clic para adjuntar</strong><span>JPG, PNG o HEIC · Máx. 10 MB</span><Button variant="secondary">Seleccionar archivo</Button></>}
          </div> : <div className="exercise-panel"><div className="camera"><Icon name="flame" size={38} /></div><h2>¿Cómo te moviste hoy?</h2><FormControl label="Tipo de ejercicio"><input value={exercise.type} onChange={event => setExercise(current => ({ ...current, type: event.target.value }))} placeholder="Ej: correr, yoga, bicicleta" /></FormControl><FormControl label="Minutos"><input type="number" min="1" value={exercise.minutes} onChange={event => setExercise(current => ({ ...current, minutes: event.target.value }))} placeholder="30" /></FormControl></div>}
          <div className="add-fields">
            <FormControl label="Descripción (opcional)"><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder={tab === 'Comida' ? 'Ej: Almuerzo balanceado con proteína y verduras…' : '¿Cómo te sentiste durante el ejercicio?'} /></FormControl>
            <div><label className="field-title">Etiquetas</label><div className="tags-picker">{availableTags.map((tag, index) => <button type="button" className={tags.includes(tag) ? 'active' : ''} onClick={() => toggleTag(tag)} key={`${tag}-${index}`}>{tag}</button>)}<button type="button" className="other-tag" onClick={() => setOther(true)}>+ Otra</button></div>
              {other && <form className="inline-add" onSubmit={event => { event.preventDefault(); const tag = newTag.trim(); if (tag && !availableTags.includes(tag)) { setCustomTags(current => [...current, tag]); setTags(current => [...current, tag]); setNewTag(''); setOther(false) } }}><input autoFocus value={newTag} onChange={event => setNewTag(event.target.value)} placeholder="Nueva etiqueta" /><Button>Agregar</Button></form>}
            </div>
            <div className="options">
              <div><span><b>☆ Analizar con IA</b><small>Detecta nutrientes automáticamente · Premium</small></span><Switch checked={false} onChange={onPremium} /></div>
              <div><span><b>Compartir con amigos</b><small>Aparece en el feed de tu comunidad</small></span><Switch checked={share} onChange={() => setShare(value => !value)} /></div>
            </div>
          </div>
        </div>
        {!valid && <p className="save-hint">{tab === 'Comida'
          ? 'Para guardar una comida, agrega una imagen.'
          : 'Para guardar un ejercicio, el tipo de ejercicio y los minutos son obligatorios.'
        }</p>}
        <footer className="add-actions"><span>✓ Cada registro suma a tu racha</span><Button variant="secondary" onClick={onCancel}>Cancelar</Button><Button onClick={save} disabled={!valid || loading}>{loading ? <><span className="spinner" />Guardando...</> : 'Guardar'}</Button></footer>
      </section>
    </Page>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button className={`switch ${checked ? 'switch--on' : ''}`} onClick={onChange} aria-pressed={checked}><span /></button>
}

function NotificationsView({ notifications, streak, onOpen, onReadAll, toast }: {
  notifications: Notification[]; streak: number; onOpen: (notification: Notification) => void; onReadAll: () => void; toast: (message: string) => void
}) {
  const [filter, setFilter] = useState('Todas')
  const visible = notifications.filter(item => filter === 'Todas' || item.category === filter)
  return (
    <Page toast={toast}>
      <div className="notifications-grid">
        <section>
          <div className="title-actions"><h1>Notificaciones</h1><Button variant="ghost" onClick={onReadAll}>Marcar todas como leídas</Button></div>
          <div className="chips">{['Todas', 'Retos', 'Comentarios'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <div className="notification-list">{visible.map(item => <button className={`notification ${item.unread ? 'notification--unread' : ''}`} onClick={() => onOpen(item)} key={item.id}><span className={`notification-icon notification-icon--${item.category.toLowerCase()}`}>{item.category === 'Comentarios' ? '“' : '✓'}</span><span><strong>{item.title}</strong><small>{item.time}</small></span>{item.unread && <i />}</button>)}</div>
        </section>
        <aside><section className="streak-card"><div><span>Tu racha</span><Icon name="flame" size={29} /></div><p>{streak}<small>días</small></p><hr /><span>¡Vas increíble, sigue así!</span></section><Sponsored compact onOpen={() => toast('Descubre este reto desde Inicio')} /></aside>
      </div>
    </Page>
  )
}

function ProfileView({ user, avatar, goals, streak, profile, onAvatar, onToggleGoal, onAddGoal, onEdit, onPremium, onLogout, toast }: {
  user: User; avatar: string; goals: string[]; streak: number; profile: { age: number; weight: number; height: number }
  onAvatar: () => void; onToggleGoal: (goal: string) => void; onAddGoal: (goal: string) => void; onEdit: () => void; onPremium: () => void; onLogout: () => void; toast: (message: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [goal, setGoal] = useState('')
  const progress = Math.min(100, 55 + streak * 2)
  const goalOptions = [...new Set([user.goal, 'Salud', 'Comer verdura', '+ ejercicio', ...goals])]
  return (
    <Page toast={toast}>
      <section className="profile-hero">
        <div className="profile-identity"><div><Avatar user={user} color={avatar} large /><Button variant="secondary" onClick={onAvatar}>Cambiar avatar</Button></div><span><h1>{user.name}</h1><p>{username(user.name)}</p></span><Button variant="secondary" onClick={onEdit}>Editar perfil</Button></div>
      </section>
      <div className="profile-grid">
        <section>
          <div className="card"><h2>Meta</h2><div className="goal-chips">{goalOptions.map((item, index) => <button className={goals.includes(item) ? 'active' : ''} onClick={() => onToggleGoal(item)} key={`${item}-${index}`}>{item}</button>)}<button className="add-goal" onClick={() => setAdding(true)}>+ Agregar meta</button></div>{adding && <form className="inline-add" onSubmit={event => { event.preventDefault(); if (goal.trim()) { onAddGoal(goal.trim()); setGoal(''); setAdding(false) } }}><input autoFocus value={goal} onChange={event => setGoal(event.target.value)} placeholder="Escribe una nueva meta" /><Button>Agregar</Button></form>}</div>
          <div className="card progress-card"><div><h2>Tu progreso</h2><strong>Racha: {streak} días</strong></div><label><span>Progreso de tus metas</span><b>{progress}%</b></label><div className="progress"><span style={{ width: `${progress}%` }} /></div><div className="chart">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => <div key={day}><span style={{ height: `${40 + ((index * 17 + streak) % 58)}%` }} /><small>{day}</small></div>)}</div></div>
        </section>
        <aside>
          <div className="card info-card"><h2>Información</h2>{[['Edad', `${profile.age}`], ['Peso', `${profile.weight} kg`], ['Altura', `${profile.height} m`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><button onClick={onEdit}>Actualizar</button></div>)}</div>
          <button className="premium-card premium-card--profile" onClick={onPremium}><span>☆ Vive+ Premium</span><p>Lleva tus hábitos más lejos con planes personalizados, análisis con IA y retos exclusivos.</p><b>Descubrir Premium</b></button>
        </aside>
      </div>
      <div className="mobile-logout"><Button variant="secondary" onClick={onLogout}>Cerrar sesión</Button></div>
    </Page>
  )
}

function App() {
  const [view, setView] = useState<View>('Crear perfil')
  const [user, setUser] = useState<User>({ name: 'María Bermúdez', email: 'maria@vivemas.com', goal: 'Ganar salud' })
  const [avatar, setAvatar] = useState(C.blue)
  const [streak, setStreak] = useState(10)
  const [completed, setCompleted] = useState(false)
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [goals, setGoals] = useState<string[]>(['Ganar salud'])
  const [profile, setProfile] = useState({ age: 22, weight: 68, height: 1.65 })
  const [modal, setModal] = useState<ModalName>(null)
  const [communityDetail, setCommunityDetail] = useState('')
  const [commentsPost, setCommentsPost] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const toastTimer = useRef<number | null>(null)

  const toast = (message: string) => {
    setToastMessage(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 3000)
  }
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const unread = notifications.filter(item => item.unread).length
  const activePost = posts.find(post => post.id === commentsPost)
  const detail = COMMUNITY.find(card => card.id === communityDetail)

  const addNotification = (title: string, category: Notification['category'], destination: View) => setNotifications(current => [
    { id: `${Date.now()}-${title}`, title, category, destination, time: 'hace un momento', unread: true }, ...current,
  ])
  const closeModal = () => {
    if (modal === 'celebration' && !completed) {
      setCompleted(true); setStreak(11)
      addNotification('¡Reto completado! Tu racha subió a 11 días', 'Retos', 'Inicio')
    }
    setModal(null)
  }
  const reset = () => {
    setView('Crear perfil'); setUser({ name: 'María Bermúdez', email: 'maria@vivemas.com', goal: 'Ganar salud' })
    setAvatar(C.blue); setStreak(10); setCompleted(false); setPosts(INITIAL_POSTS); setLiked(new Set())
    setFollowing(new Set()); setNotifications(INITIAL_NOTIFICATIONS); setGoals(['Ganar salud'])
    setProfile({ age: 22, weight: 68, height: 1.65 }); setModal(null); setCommentsPost(''); setToastMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toggleLike = (id: string) => setLiked(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleFollow = (name: string) => setFollowing(current => { const next = new Set(current); next.has(name) ? next.delete(name) : next.add(name); return next })
  const selectNotification = (item: Notification) => {
    setNotifications(current => current.map(notification => notification.id === item.id ? { ...notification, unread: false } : notification))
    navigate(item.destination)
  }

  return (
    <div className="app">
      {view !== 'Crear perfil' && <Navbar view={view} user={user} avatar={avatar} unread={unread} following={following.size} navigate={navigate} logout={reset} />}
      <div className="view-transition" key={view}>
        {view === 'Crear perfil' && <RegisterView onRegister={registered => { setUser(registered); setGoals([registered.goal]); navigate('Inicio') }} onDemo={() => navigate('Inicio')} />}
        {view === 'Inicio' && <HomeView user={user} streak={streak} completed={completed} posts={posts} liked={liked} following={following} onComplete={() => !completed && setModal('celebration')} onLike={toggleLike} onComments={setCommentsPost} onFollow={toggleFollow} onChallenge={() => setModal('challenge')} onPremium={() => setModal('premium')} toast={toast} />}
        {view === 'Comunidad' && <CommunityView liked={liked} following={following} onLike={toggleLike} onFollow={toggleFollow} onOpen={id => { setCommunityDetail(id); setModal('community') }} onChallenge={() => setModal('challenge')} toast={toast} />}
        {view === 'Agregar' && <AddView user={user} avatar={avatar} onSave={(post, share) => { if (share) setPosts(current => [post, ...current]); addNotification('Guardaste un nuevo registro', 'Retos', 'Inicio'); navigate('Inicio'); toast('¡Listo! Tu racha sigue') }} onCancel={() => navigate('Inicio')} onPremium={() => setModal('premium')} toast={toast} />}
        {view === 'Notificaciones' && <NotificationsView notifications={notifications} streak={streak} onOpen={selectNotification} onReadAll={() => setNotifications(current => current.map(item => ({ ...item, unread: false })))} toast={toast} />}
        {view === 'Perfil' && <ProfileView user={user} avatar={avatar} goals={goals} streak={streak} profile={profile} onAvatar={() => setModal('avatar')} onToggleGoal={goal => setGoals(current => current.includes(goal) ? current.filter(item => item !== goal) : [...current, goal])} onAddGoal={goal => setGoals(current => current.includes(goal) ? current : [...current, goal])} onEdit={() => setModal('edit')} onPremium={() => setModal('premium')} onLogout={reset} toast={toast} />}
      </div>

      {activePost && <CommentsDrawer post={activePost} user={user} onClose={() => setCommentsPost('')} onAdd={text => setPosts(current => current.map(post => post.id === activePost.id ? { ...post, comments: [...post.comments, { id: Date.now(), author: user.name, text }] } : post))} />}
      {modal === 'celebration' && <Modal title="¡Reto completado!" onClose={closeModal}><div className="celebration"><div className="confetti">{Array.from({ length: 18 }).map((_, index) => <i key={index} />)}</div><div className="celebration-icon">✓</div><p>Tu racha sube a <strong>11 días</strong></p><Button onClick={closeModal}>¡Genial!</Button></div></Modal>}
      {modal === 'challenge' && <Modal title="Reto grupal: 5 días frescos" onClose={closeModal}><div className="modal-copy"><span className="sponsored-label">Patrocinado</span><p>Comparte frutas y verduras con la comunidad durante cinco días. Recibirás ideas sencillas y acompañamiento diario.</p><ul><li>Una acción saludable al día</li><li>Apoyo de la comunidad</li><li>Insignia al completar</li></ul><Button variant="yellow" onClick={() => { closeModal(); toast('¡Te uniste al reto!'); addNotification('Te uniste al reto 5 días frescos', 'Retos', 'Inicio') }}>Unirme al reto</Button></div></Modal>}
      {modal === 'premium' && <Modal title="Vive+ Premium" onClose={closeModal}><div className="modal-copy"><p>Potencia tus hábitos con herramientas creadas para acompañarte.</p><ul><li>Análisis de comidas con IA</li><li>Una experiencia sin anuncios</li><li>Retos exclusivos y planes personalizados</li></ul><Button variant="yellow" onClick={() => { closeModal(); toast('Función de demostración') }}>Probar Premium</Button></div></Modal>}
      {modal === 'avatar' && <Modal title="Elige tu avatar" onClose={closeModal}><div className="avatar-options">{[C.blue, C.green, C.yellow, C.navy, '#8B6BB5', '#E57A6F'].map(color => <button key={color} style={{ backgroundColor: color }} onClick={() => { setAvatar(color); closeModal() }}>{initials(user.name)}</button>)}</div></Modal>}
      {modal === 'edit' && <EditProfile profile={profile} onClose={closeModal} onSave={values => { setProfile(values); closeModal(); toast('Perfil actualizado') }} />}
      {modal === 'community' && detail && <Modal title={detail.title} onClose={closeModal} wide><div className="community-detail"><img src={detail.image} alt={detail.title} /><div><div className="detail-author"><div className="feed-avatar" style={{ backgroundColor: detail.avatar }}>{detail.initials}</div><strong>{detail.author}</strong></div><p>{detail.text}</p><LikeButton active={liked.has(detail.id)} count={detail.likes + (liked.has(detail.id) ? 1 : 0)} onClick={() => toggleLike(detail.id)} /><h3>Comentarios</h3><div className="detail-comment"><strong>Sofía</strong><p>¡Gracias por compartir esta idea!</p></div></div></div></Modal>}
      {toastMessage && <Toast message={toastMessage} />}
      <button className="reset" onClick={reset}>↺ Reiniciar demo</button>
    </div>
  )
}

function EditProfile({ profile, onClose, onSave }: { profile: { age: number; weight: number; height: number }; onClose: () => void; onSave: (values: { age: number; weight: number; height: number }) => void }) {
  const [values, setValues] = useState({ age: String(profile.age), weight: String(profile.weight), height: String(profile.height) })
  const valid = Number(values.age) >= 18 && Number(values.age) <= 100 && Number(values.weight) > 20 && Number(values.weight) < 300 && Number(values.height) > 1 && Number(values.height) < 2.5
  return <Modal title="Editar perfil" onClose={onClose}><form className="edit-form" onSubmit={event => { event.preventDefault(); if (valid) onSave({ age: Number(values.age), weight: Number(values.weight), height: Number(values.height) }) }}><FormControl label="Edad"><input type="number" min="18" max="100" value={values.age} onChange={event => setValues(current => ({ ...current, age: event.target.value }))} /></FormControl><FormControl label="Peso (kg)"><input type="number" min="20" max="300" value={values.weight} onChange={event => setValues(current => ({ ...current, weight: event.target.value }))} /></FormControl><FormControl label="Altura (m)"><input type="number" min="1" max="2.5" step=".01" value={values.height} onChange={event => setValues(current => ({ ...current, height: event.target.value }))} /></FormControl>{!valid && <p className="save-hint">Revisa que todos los valores sean válidos.</p>}<Button disabled={!valid}>Guardar cambios</Button></form></Modal>
}

export default App
