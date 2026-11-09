import { useState, useMemo } from 'react'
import type { Challenge, ChallengeCategory, ChallengeDuration, UserChallengeProgress } from '../types'

export const CHALLENGES_CATALOG: Challenge[] = [
  // 1. ACTIVIDAD FÍSICA
  {
    id: 'act_caminata_diaria',
    title: 'Caminata activa de 25 minutos',
    category: 'Actividad física',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Activar tu sistema cardiovascular y oxigenar el cuerpo.',
    description:
      'Sal a caminar a paso ágil continuo durante 25 minutos. Puede ser al aire libre, camino al trabajo o en caminadora.',
    completionMethod: 'Marca al finalizar tu caminata de 25 minutos.',
    icon: '🚶‍♂️',
    goalMatch: 'Bajar de peso',
  },
  {
    id: 'act_movilidad_matutina',
    title: 'Pausa de movilidad y estiramientos',
    category: 'Actividad física',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Mejorar la flexibilidad articular y aliviar la tensión acumulada.',
    description:
      'Dedica 10 minutos por la mañana a rotaciones de hombros, estiramiento de columna, cadera y piernas.',
    completionMethod: 'Marca al completar tu rutina de movilidad.',
    icon: '🧘',
    goalMatch: 'Hacer más ejercicio',
  },
  {
    id: 'act_fuerza_3dias',
    title: 'Reto 3 días de fuerza corporal',
    category: 'Actividad física',
    duration: '3 días',
    totalDays: 3,
    difficulty: 'Intermedio',
    objective: 'Fortalecer grandes grupos musculares con tu propio peso.',
    description:
      'Realiza 3 series de 10 sentadillas, 10 flexiones (en pared o suelo) y 30 segundos de plancha durante 3 días.',
    completionMethod: 'Registra cada día que completes tu circuito de fuerza.',
    icon: '💪',
    goalMatch: 'Hacer más ejercicio',
  },
  {
    id: 'act_semana_activa_7dias',
    title: 'Semana activa: 30 min diarios',
    category: 'Actividad física',
    duration: '7 días',
    totalDays: 7,
    difficulty: 'Progresivo',
    objective: 'Consolidar el hábito de movimiento continuo toda la semana.',
    description:
      'Acumula al menos 30 minutos de actividad física diaria durante 7 días consecutivos (trotar, bailar, bici o gimnasio).',
    completionMethod: 'Registra cada día completado para acumular tus 7 días.',
    icon: '🏃‍♀️',
    goalMatch: 'Hacer más ejercicio',
  },

  // 2. ALIMENTACIÓN SALUDABLE
  {
    id: 'alim_arcoiris_plato',
    title: 'Arcoíris en tu plato del almuerzo',
    category: 'Alimentación saludable',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Aumentar la variedad de micronutrientes y antioxidantes.',
    description:
      'Incluye al menos tres colores naturales diferentes de vegetales o verduras frescas en tu almuerzo (ej: tomate rojo, zanahoria naranja y espinaca verde).',
    completionMethod: 'Marca al disfrutar tu almuerzo colorido.',
    icon: '🥗',
    goalMatch: 'Comer más verdura',
  },
  {
    id: 'alim_snack_consciente',
    title: 'Reemplazo de snack ultraprocesado',
    category: 'Alimentación saludable',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Reducir el consumo de azúcares y harinas refinadas a media tarde.',
    description:
      'Sustituye paquetes o dulces por una fruta fresca de temporada acompañada de un puñado pequeño de frutos secos o yogur natural.',
    completionMethod: 'Marca al consumir tu snack natural.',
    icon: '🍎',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'alim_5dias_sin_procesados',
    title: 'Reto 5 días de cocina real en casa',
    category: 'Alimentación saludable',
    duration: '5 días',
    totalDays: 5,
    difficulty: 'Intermedio',
    objective: 'Comer alimentos preparados con ingredientes naturales.',
    description:
      'Durante 5 días, prepara tus comidas principales en casa utilizando ingredientes frescos y evitando comida rápida o ultraprocesados.',
    completionMethod: 'Registra cada día que consumas comida casera y natural.',
    icon: '🥑',
    goalMatch: 'Bajar de peso',
  },
  {
    id: 'alim_semana_vegetal_7dias',
    title: 'Semana verde: verdura en cada comida',
    category: 'Alimentación saludable',
    duration: '7 días',
    totalDays: 7,
    difficulty: 'Progresivo',
    objective: 'Llegar a la recomendación diaria de fibra y nutrientes.',
    description:
      'Asegura que tu almuerzo y cena contengan al menos una porción generosa de hortalizas o ensaladas durante los 7 días de la semana.',
    completionMethod: 'Marca cada día cumplido con tu porción de vegetales.',
    icon: '🥦',
    goalMatch: 'Comer más verdura',
  },

  // 3. HIDRATACIÓN
  {
    id: 'hid_vaso_despertar',
    title: 'Primer vaso de agua al despertar',
    category: 'Hidratación',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Reactivar tu organismo y metabolismo tras el ayuno nocturno.',
    description:
      'Toma un vaso completo de agua (250-300 ml) a temperatura ambiente justo al levantarte, antes de tomar café o desayunar.',
    completionMethod: 'Marca al tomar tu primer vaso de agua matutino.',
    icon: '💧',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'hid_6vasos_dia',
    title: 'Objetivo 6 a 8 vasos de agua al día',
    category: 'Hidratación',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Mantener un balance hídrico adecuado durante tu jornada.',
    description:
      'Distribuye a lo largo del día entre 1.5 y 2 litros de agua pura o infusiones herbales sin azúcar.',
    completionMethod: 'Marca al completar tu meta diaria de vasos de agua.',
    icon: '🚰',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'hid_3dias_cero_azucar',
    title: 'Reto 3 días: cero gaseosas y bebidas azucaradas',
    category: 'Hidratación',
    duration: '3 días',
    totalDays: 3,
    difficulty: 'Intermedio',
    objective: 'Disminuir calorías vacías y deshabituar el paladar al exceso de dulce.',
    description:
      'Sustituye cualquier gaseosa, té envasado o jugo comercial por agua con rodajas de limón, menta o agua mineral durante 3 días.',
    completionMethod: 'Registra cada día que bebas únicamente agua o infusiones sin azúcar.',
    icon: '🍋',
    goalMatch: 'Bajar de peso',
  },
  {
    id: 'hid_7dias_termo_siempre',
    title: 'Reto 7 días: termo siempre a la mano',
    category: 'Hidratación',
    duration: '7 días',
    totalDays: 7,
    difficulty: 'Progresivo',
    objective: 'Crear el reflejo automático de tomar agua constantemente.',
    description:
      'Lleva tu botella o termo recargable a donde vayas (escritorio, paseos o transporte) y rellénalo al menos dos veces al día durante una semana.',
    completionMethod: 'Marca cada día con termo activo y recargado.',
    icon: '🍶',
    goalMatch: 'Ganar salud',
  },

  // 4. DESCANSO Y SUEÑO
  {
    id: 'des_desconexion_pantallas',
    title: 'Noche libre de pantallas 30 min antes',
    category: 'Descanso y sueño',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Permitir la liberación natural de melatonina para conciliar el sueño.',
    description:
      'Apaga teléfono, tablet, computador y televisor al menos 30 minutos antes de dormir. Reemplázalos por lectura, estiramientos o música suave.',
    completionMethod: 'Marca al apagar pantallas antes de acostarte.',
    icon: '🌙',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'des_3noches_relajacion',
    title: 'Reto 3 noches de rutina reparadora',
    category: 'Descanso y sueño',
    duration: '3 días',
    totalDays: 3,
    difficulty: 'Intermedio',
    objective: 'Inducir un descanso profundo y continuo durante la noche.',
    description:
      'Durante 3 noches consecutivas, prepara tu habitación oscura y templada, y practica 5 minutos de respiración lenta antes de cerrar los ojos.',
    completionMethod: 'Marca cada noche que cumplas tu rutina reparadora.',
    icon: '🕯️',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'des_7dias_horario_fijo',
    title: 'Reto 7 días: horario regular de sueño (7-8 h)',
    category: 'Descanso y sueño',
    duration: '7 días',
    totalDays: 7,
    difficulty: 'Progresivo',
    objective: 'Sincronizar el ritmo circadiano para levantarte con máxima energía.',
    description:
      'Acuéstate y levántate aproximadamente a la misma hora durante 7 días seguidos, garantizando entre 7 y 8 horas de sueño real.',
    completionMethod: 'Registra cada día que cumplas tu horario fijado.',
    icon: '⏰',
    goalMatch: 'Ganar salud',
  },

  // 5. SALUD MENTAL Y BIENESTAR EMOCIONAL
  {
    id: 'ment_pausa_respiracion',
    title: '5 minutos de respiración 4-4-4',
    category: 'Salud mental',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Bajar los niveles de cortisol y recuperar la calma mental.',
    description:
      'Inhala en 4 segundos, retén el aire 4 segundos y exhala en 4 segundos. Repite este ciclo conscientemente durante 5 minutos a mitad del día.',
    completionMethod: 'Marca al terminar tu pausa de respiración.',
    icon: '🌸',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'ment_diario_gratitud',
    title: 'Diario de gratitud: 3 cosas positivas',
    category: 'Salud mental',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Fomentar una actitud positiva y reducir el sesgo de negatividad.',
    description:
      'Escribe o reflexiona sobre 3 situaciones, personas o momentos sencillos por los que te sientas agradecido el día de hoy.',
    completionMethod: 'Marca al anotar tus 3 gratitudes del día.',
    icon: '✍️',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'ment_5dias_aire_libre',
    title: 'Reto 5 días: 15 min al aire libre sin pantallas',
    category: 'Salud mental',
    duration: '5 días',
    totalDays: 5,
    difficulty: 'Intermedio',
    objective: 'Conectar con el entorno natural y descansar la vista y mente.',
    description:
      'Pasa 15 minutos en un parque, balcón o jardín observando el entorno, sin consultar el teléfono ni redes sociales durante 5 días.',
    completionMethod: 'Registra cada día completado al aire libre.',
    icon: '🌳',
    goalMatch: 'Ganar salud',
  },

  // 6. CONSTANCIA EN HÁBITOS
  {
    id: 'const_plan_comidas_dia',
    title: 'Planifica tus comidas del día',
    category: 'Constancia',
    duration: 'Diario',
    totalDays: 1,
    difficulty: 'Fácil',
    objective: 'Evitar decisiones impulsivas o poco saludables por falta de tiempo.',
    description:
      'Dedica 5 minutos por la mañana a definir qué vas a almorzar y cenar, asegurando opciones balanceadas y agua disponible.',
    completionMethod: 'Marca al tener listo tu plan del día.',
    icon: '📝',
    goalMatch: 'Bajar de peso',
  },
  {
    id: 'const_3dias_seguidos',
    title: 'Reto 3 días consecutivos de registro',
    category: 'Constancia',
    duration: '3 días',
    totalDays: 3,
    difficulty: 'Intermedio',
    objective: 'Crear consistencia inicial y fidelidad con tus metas.',
    description:
      'Cumple tu reto diario y registra tu comida o ejercicio en Vive+ durante tres días seguidos sin interrupción.',
    completionMethod: 'Registra cada uno de los 3 días cumplidos.',
    icon: '🎯',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'const_7dias_vivemas',
    title: 'Semana completa de constancia Vive+',
    category: 'Constancia',
    duration: '7 días',
    totalDays: 7,
    difficulty: 'Progresivo',
    objective: 'Construir una racha sólida de bienestar durante toda una semana.',
    description:
      'Mantén activos tus hábitos saludables durante los 7 días de la semana, sumando a tu racha consecutiva.',
    completionMethod: 'Marca cada día para avanzar en la barra semanal.',
    icon: '🏆',
    goalMatch: 'Ganar salud',
  },
  {
    id: 'const_14dias_consolidacion',
    title: 'Reto 14 días: hábito consolidado',
    category: 'Constancia',
    duration: '14 días',
    totalDays: 14,
    difficulty: 'Progresivo',
    objective: 'Afianzar un cambio de estilo de vida que perdure en el tiempo.',
    description:
      'El compromiso de dos semanas completas para transformar una acción diaria en un hábito permanente sin esfuerzo.',
    completionMethod: 'Registra cada día cumplido para completar las 2 semanas.',
    icon: '⭐',
    goalMatch: 'Ganar salud',
  },
]

interface ChallengesSectionProps {
  userGoal: string
  streak: number
  progressMap: Record<string, UserChallengeProgress>
  todayCompleted: boolean
  onCompleteChallengeDay: (challenge: Challenge) => void
  toast: (message: string) => void
}

export function ChallengesSection({
  userGoal,
  progressMap,
  todayCompleted,
  onCompleteChallengeDay,
  toast,
}: ChallengesSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
  const [selectedDuration, setSelectedDuration] = useState<string>('Todos')
  const [activeModalChallenge, setActiveModalChallenge] = useState<Challenge | null>(null)

  const categories: (string | ChallengeCategory)[] = [
    'Todas',
    'Actividad física',
    'Alimentación saludable',
    'Hidratación',
    'Descanso y sueño',
    'Salud mental',
    'Constancia',
  ]

  const durations: (string | ChallengeDuration)[] = ['Todos', 'Diario', '3 días', '5 días', '7 días', '14 días']

  const filteredChallenges = useMemo(() => {
    return CHALLENGES_CATALOG.filter(ch => {
      const matchCat = selectedCategory === 'Todas' || ch.category === selectedCategory
      const matchDur = selectedDuration === 'Todos' || ch.duration === selectedDuration
      return matchCat && matchDur
    })
  }, [selectedCategory, selectedDuration])

  // Suggested daily challenge matching user's goal
  const dailySuggested = useMemo(() => {
    const matched = CHALLENGES_CATALOG.find(
      ch => ch.duration === 'Diario' && ch.goalMatch?.toLowerCase() === userGoal?.toLowerCase()
    )
    return matched || CHALLENGES_CATALOG[0]
  }, [userGoal])

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])

  return (
    <div className="challenges-hub-container">
      {/* Featured / Daily Challenge Header */}
      <div className="daily-featured-challenge card">
        <div className="daily-featured-badge">
          <span>🌟 Reto sugerido para hoy</span>
          <span className="goal-tag">Meta: {userGoal || 'Ganar salud'}</span>
        </div>

        <div className="daily-featured-content">
          <div className="daily-featured-icon">{dailySuggested.icon}</div>
          <div className="daily-featured-info">
            <div className="daily-featured-meta">
              <span className="tag-pill tag-pill--category">{dailySuggested.category}</span>
              <span className="tag-pill tag-pill--duration">{dailySuggested.duration}</span>
              <span className="tag-pill tag-pill--difficulty">{dailySuggested.difficulty}</span>
            </div>
            <h3>{dailySuggested.title}</h3>
            <p className="daily-featured-desc">{dailySuggested.description}</p>
            <div className="daily-featured-obj">
              <strong>Objetivo:</strong> {dailySuggested.objective}
            </div>
          </div>
        </div>

        <div className="daily-featured-footer">
          <span className="completion-instruction">
            ✓ {dailySuggested.completionMethod}
          </span>
          <button
            type="button"
            className="button button--primary btn-complete-featured"
            disabled={todayCompleted}
            onClick={() => onCompleteChallengeDay(dailySuggested)}
          >
            {todayCompleted ? '¡Reto completado hoy! ✓' : 'Completar reto de hoy'}
          </button>
        </div>
      </div>

      {/* Explorer / Filter Section */}
      <div className="challenges-explorer">
        <div className="explorer-header">
          <div>
            <h2>Explorar más retos</h2>
            <p className="sub-caption">
              Variados en actividad física, nutrición, hidratación, descanso, bienestar emocional y
              constancia.
            </p>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="chips challenges-filter-chips">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              className={selectedCategory === cat ? 'active' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Duration Filter Pills */}
        <div className="duration-pills-row">
          <span>Duración:</span>
          {durations.map(dur => (
            <button
              key={dur}
              type="button"
              className={`duration-pill-btn ${selectedDuration === dur ? 'active' : ''}`}
              onClick={() => setSelectedDuration(dur)}
            >
              {dur}
            </button>
          ))}
        </div>

        {/* Challenge Cards Grid */}
        <div className="challenges-grid">
          {filteredChallenges.map(ch => {
            const prog = progressMap[ch.id] || { daysCompleted: 0, completed: false }
            const isCompletedToday = prog.lastCompletedDate === todayStr
            const percent = Math.round((prog.daysCompleted / ch.totalDays) * 100)

            return (
              <div
                key={ch.id}
                className={`challenge-card card ${prog.completed ? 'challenge-card--finished' : ''}`}
              >
                <div className="challenge-card-top">
                  <span className="challenge-icon">{ch.icon}</span>
                  <div className="challenge-tags">
                    <span className="tag-pill tag-pill--category">{ch.category}</span>
                    <span className="tag-pill tag-pill--duration">{ch.duration}</span>
                  </div>
                </div>

                <h3 className="challenge-title">{ch.title}</h3>
                <p className="challenge-desc">{ch.description}</p>

                <div className="challenge-target-box">
                  <small>🎯 Objetivo:</small>
                  <span>{ch.objective}</span>
                </div>

                {/* Multi-day progress bar */}
                {ch.totalDays > 1 && (
                  <div className="challenge-progress-wrap">
                    <div className="challenge-progress-labels">
                      <span>Progreso:</span>
                      <strong>
                        {prog.daysCompleted} de {ch.totalDays} días ({percent}%)
                      </strong>
                    </div>
                    <div className="challenge-progress-bar">
                      <div
                        className="challenge-progress-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="challenge-card-actions">
                  <button
                    type="button"
                    className="button button--secondary btn-detail"
                    onClick={() => setActiveModalChallenge(ch)}
                  >
                    Ver detalles
                  </button>

                  <button
                    type="button"
                    className="button button--primary btn-register-progress"
                    disabled={isCompletedToday || prog.completed}
                    onClick={() => onCompleteChallengeDay(ch)}
                  >
                    {prog.completed
                      ? '¡Reto finalizado! 🏆'
                      : isCompletedToday
                      ? 'Completado hoy ✓'
                      : ch.totalDays > 1
                      ? `Registrar día ${prog.daysCompleted + 1}`
                      : 'Completar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Challenge Detail Modal */}
      {activeModalChallenge && (
        <div
          className="overlay"
          onMouseDown={e => e.currentTarget === e.target && setActiveModalChallenge(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal challenge-detail-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setActiveModalChallenge(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="challenge-modal-header">
              <span className="modal-ch-icon">{activeModalChallenge.icon}</span>
              <div>
                <h2>{activeModalChallenge.title}</h2>
                <div className="modal-ch-tags">
                  <span className="tag-pill tag-pill--category">
                    {activeModalChallenge.category}
                  </span>
                  <span className="tag-pill tag-pill--duration">
                    {activeModalChallenge.duration} ({activeModalChallenge.totalDays}{' '}
                    {activeModalChallenge.totalDays === 1 ? 'día' : 'días'})
                  </span>
                  <span className="tag-pill tag-pill--difficulty">
                    Dificultad: {activeModalChallenge.difficulty}
                  </span>
                </div>
              </div>
            </div>

            <div className="challenge-modal-body">
              <section className="ch-section">
                <h4>🎯 Objetivo del reto</h4>
                <p>{activeModalChallenge.objective}</p>
              </section>

              <section className="ch-section">
                <h4>📖 Descripción y cómo realizarlo</h4>
                <p>{activeModalChallenge.description}</p>
              </section>

              <section className="ch-section">
                <h4>✅ Forma de registrar su cumplimiento</h4>
                <p>{activeModalChallenge.completionMethod}</p>
              </section>

              <div className="ch-tip-box">
                <strong>💡 Consejo Vive+:</strong> La constancia en pequeños pasos genera cambios
                reales y duraderos en tu salud y bienestar.
              </div>
            </div>

            <div className="challenge-modal-footer">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setActiveModalChallenge(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  onCompleteChallengeDay(activeModalChallenge)
                  setActiveModalChallenge(null)
                }}
                disabled={
                  (progressMap[activeModalChallenge.id]?.lastCompletedDate === todayStr) ||
                  progressMap[activeModalChallenge.id]?.completed
                }
              >
                {progressMap[activeModalChallenge.id]?.completed
                  ? 'Reto completado 🏆'
                  : progressMap[activeModalChallenge.id]?.lastCompletedDate === todayStr
                  ? 'Registrado hoy ✓'
                  : 'Registrar cumplimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
