import { useState, useMemo } from 'react'
import type { WeightRecord, Info } from '../types'
import { calculateBMI, getBMICategory } from '../services/storageService'
import { ConfirmModal } from './ConfirmModal'

interface DailyProgressSectionProps {
  userId: string
  streak: number
  profile: Info
  records: WeightRecord[]
  onSaveRecord: (weight: number, height: number, date: string, notes?: string) => Promise<void>
  onDeleteRecord: (id: string, date: string) => Promise<void>
  onUpdateHeight: (height: number) => Promise<void>
  toast: (message: string) => void
}

export function DailyProgressSection({
  streak,
  profile,
  records,
  onSaveRecord,
  onDeleteRecord,
  onUpdateHeight,
  toast,
}: DailyProgressSectionProps) {
  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])

  // Form state for new / updated entry
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [inputWeight, setInputWeight] = useState(
    profile.weight !== null ? String(profile.weight) : ''
  )
  const [inputHeight, setInputHeight] = useState(
    profile.height !== null ? String(profile.height) : '1.70'
  )
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [chartView, setChartView] = useState<'weight' | 'bmi'>('weight')

  // State for delete modal
  const [recordToDelete, setRecordToDelete] = useState<WeightRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Live calculation of current values
  const currentWeightNum = Number(inputWeight)
  const currentHeightNum = Number(inputHeight)
  const liveBMI = useMemo(
    () => calculateBMI(currentWeightNum, currentHeightNum),
    [currentWeightNum, currentHeightNum]
  )
  const liveCategory = useMemo(() => getBMICategory(liveBMI), [liveBMI])

  // Sorting records by date ascending for charts, descending for history table
  const sortedRecordsAsc = useMemo(
    () => [...records].sort((a, b) => a.date.localeCompare(b.date)),
    [records]
  )
  const sortedRecordsDesc = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records]
  )

  // Progress metrics comparisons
  const metrics = useMemo(() => {
    if (sortedRecordsAsc.length === 0) {
      return {
        initialWeight: null,
        currentWeight: null,
        totalWeightDiff: 0,
        initialBMI: null,
        currentBMI: null,
        totalBMIDiff: 0,
        lastWeightDiff: 0,
        minWeight: null,
        maxWeight: null,
      }
    }

    const first = sortedRecordsAsc[0]
    const last = sortedRecordsAsc[sortedRecordsAsc.length - 1]
    const prev = sortedRecordsAsc.length > 1 ? sortedRecordsAsc[sortedRecordsAsc.length - 2] : first

    const weights = sortedRecordsAsc.map(r => r.weight)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)

    return {
      initialWeight: first.weight,
      currentWeight: last.weight,
      totalWeightDiff: Number((last.weight - first.weight).toFixed(2)),
      initialBMI: first.bmi,
      currentBMI: last.bmi,
      totalBMIDiff: Number((last.bmi - first.bmi).toFixed(2)),
      lastWeightDiff: Number((last.weight - prev.weight).toFixed(2)),
      minWeight: minW,
      maxWeight: maxW,
    }
  }, [sortedRecordsAsc])

  // Handle submitting weight & height record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWeightNum || currentWeightNum <= 20 || currentWeightNum >= 300) {
      toast('Ingresa un peso válido entre 20 y 300 kg.')
      return
    }
    if (!currentHeightNum || currentHeightNum <= 1.0 || currentHeightNum >= 2.5) {
      toast('Ingresa una altura válida entre 1.00 y 2.50 metros.')
      return
    }

    setSaving(true)
    try {
      await onSaveRecord(currentWeightNum, currentHeightNum, selectedDate, notes.trim())
      if (profile.height !== currentHeightNum) {
        await onUpdateHeight(currentHeightNum)
      }
      toast(`Registro guardado para el ${selectedDate}. IMC: ${liveBMI}`)
      setNotes('')
    } catch {
      toast('No se pudo guardar el registro.')
    } finally {
      setSaving(false)
    }
  }

  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return
    setDeleting(true)
    try {
      await onDeleteRecord(recordToDelete.id, recordToDelete.date)
      toast(`Registro del ${recordToDelete.date} eliminado.`)
      setRecordToDelete(null)
    } catch {
      toast('Error al eliminar el registro.')
    } finally {
      setDeleting(false)
    }
  }

  // SVG Chart Calculation
  const chartData = useMemo(() => {
    if (sortedRecordsAsc.length < 2) return null

    const values = sortedRecordsAsc.map(r => (chartView === 'weight' ? r.weight : r.bmi))
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal

    const width = 640
    const height = 180
    const paddingX = 45
    const paddingY = 25

    const points = sortedRecordsAsc.map((r, i) => {
      const x = paddingX + (i / (sortedRecordsAsc.length - 1)) * (width - paddingX * 2)
      const val = chartView === 'weight' ? r.weight : r.bmi
      const y = height - paddingY - ((val - minVal) / range) * (height - paddingY * 2)
      return { x, y, val, date: r.date }
    })

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')

    return { width, height, points, pathD, minVal, maxVal }
  }, [sortedRecordsAsc, chartView])

  return (
    <div className="daily-progress-container">
      {/* Header & Streak progress */}
      <div className="card progress-card daily-progress-main">
        <div className="progress-header">
          <div>
            <h2>Tu progreso diario</h2>
            <p className="section-subheading">
              Registra tu evolución corporal día a día y conoce tu estado de salud orientativo.
            </p>
          </div>
          <div className="streak-badge">
            <span className="streak-flame">🔥</span>
            <strong>Racha: {streak} días</strong>
          </div>
        </div>

        {/* Indicators and Comparative Metrics */}
        {sortedRecordsAsc.length > 0 && (
          <div className="metrics-summary-grid">
            <div className="metric-box">
              <span className="metric-label">Peso actual</span>
              <strong className="metric-val">{metrics.currentWeight} kg</strong>
              <small className="metric-hint">
                {metrics.lastWeightDiff === 0
                  ? 'Sin cambios recientes'
                  : metrics.lastWeightDiff > 0
                  ? `+${metrics.lastWeightDiff} kg vs anterior`
                  : `${metrics.lastWeightDiff} kg vs anterior`}
              </small>
            </div>

            <div className="metric-box">
              <span className="metric-label">IMC actual</span>
              <div className="metric-imc-wrap">
                <strong className="metric-val">{metrics.currentBMI}</strong>
                <span className={`bmi-mini-pill ${getBMICategory(metrics.currentBMI || 0).badgeClass}`}>
                  {getBMICategory(metrics.currentBMI || 0).label}
                </span>
              </div>
              <small className="metric-hint">
                {metrics.totalBMIDiff === 0
                  ? 'Estable desde inicio'
                  : metrics.totalBMIDiff > 0
                  ? `+${metrics.totalBMIDiff} vs inicial`
                  : `${metrics.totalBMIDiff} vs inicial`}
              </small>
            </div>

            <div className="metric-box">
              <span className="metric-label">Evolución total</span>
              <strong
                className={`metric-val ${
                  metrics.totalWeightDiff < 0
                    ? 'val-down'
                    : metrics.totalWeightDiff > 0
                    ? 'val-up'
                    : ''
                }`}
              >
                {metrics.totalWeightDiff > 0 ? `+${metrics.totalWeightDiff}` : metrics.totalWeightDiff} kg
              </strong>
              <small className="metric-hint">
                Desde primer registro ({sortedRecordsAsc[0]?.date})
              </small>
            </div>

            <div className="metric-box">
              <span className="metric-label">Mínimo registrado</span>
              <strong className="metric-val">{metrics.minWeight} kg</strong>
              <small className="metric-hint">Máximo: {metrics.maxWeight} kg</small>
            </div>
          </div>
        )}

        {/* Daily Weight & Height Logging Form */}
        <div className="card-sub-form">
          <h3 className="sub-title">Registrar métricas del día</h3>
          <form className="progress-form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={e => setSelectedDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={inputWeight}
                placeholder="Ej: 70.5"
                onChange={e => setInputWeight(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Altura (metros)</label>
              <input
                type="number"
                step="0.01"
                min="1.0"
                max="2.5"
                value={inputHeight}
                placeholder="Ej: 1.72"
                onChange={e => setInputHeight(e.target.value)}
                required
              />
              <span className="input-hint">Actualizable cuando lo necesites</span>
            </div>

            <div className="form-group form-group--calc">
              <label>IMC calculado</label>
              <div className="live-bmi-display">
                <span className="live-bmi-val">{liveBMI > 0 ? liveBMI : '—'}</span>
                {liveBMI > 0 && (
                  <span className={`bmi-badge ${liveCategory.badgeClass}`}>
                    {liveCategory.label}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group form-group--full">
              <label>Notas u observación del día (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Pesaje en ayunas, después de entrenar, semana con buena hidratación..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="form-actions-row">
              <button
                type="submit"
                className="button button--primary"
                disabled={saving || !currentWeightNum || !currentHeightNum}
              >
                {saving ? 'Guardando...' : 'Guardar registro diario'}
              </button>
            </div>
          </form>

          {/* Medical Disclaimer */}
          <div className="medical-disclaimer-box" role="note">
            <span className="disclaimer-icon">ℹ️</span>
            <div>
              <strong>Aclaración importante sobre salud:</strong>
              <p>
                El <strong>Índice de Masa Corporal (IMC)</strong> es una fórmula matemática
                orientativa (peso en kg / altura en m²) y no sustituye una evaluación médica
                profesional ni considera porcentaje de masa muscular, densidad ósea o composición
                grasa individual.
              </p>
            </div>
          </div>
        </div>

        {/* Evolution Chart */}
        <div className="progress-chart-card">
          <div className="chart-heading-row">
            <div>
              <h3 className="sub-title">Gráfica de evolución en el tiempo</h3>
              <small>Compara el cambio de tus valores entre diferentes fechas</small>
            </div>
            <div className="chart-toggle-group">
              <button
                type="button"
                className={`chart-toggle-btn ${chartView === 'weight' ? 'active' : ''}`}
                onClick={() => setChartView('weight')}
              >
                Peso (kg)
              </button>
              <button
                type="button"
                className={`chart-toggle-btn ${chartView === 'bmi' ? 'active' : ''}`}
                onClick={() => setChartView('bmi')}
              >
                IMC
              </button>
            </div>
          </div>

          {chartData ? (
            <div className="svg-chart-container">
              <svg
                viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                className="progress-svg-chart"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background grid lines */}
                <line
                  x1="40"
                  y1="25"
                  x2={chartData.width - 40}
                  y2="25"
                  stroke="#E2EBF0"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1={chartData.height / 2}
                  x2={chartData.width - 40}
                  y2={chartData.height / 2}
                  stroke="#E2EBF0"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1={chartData.height - 25}
                  x2={chartData.width - 40}
                  y2={chartData.height - 25}
                  stroke="#E2EBF0"
                />

                {/* Evolution Path line */}
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke={chartView === 'weight' ? '#1DA0DB' : '#1DDBAF'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {chartData.points.map((p, i) => (
                  <g key={p.date} className="chart-point-group">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      fill="#FFFFFF"
                      stroke={chartView === 'weight' ? '#1DA0DB' : '#1DDBAF'}
                      strokeWidth="3"
                    />
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      className="chart-point-text"
                    >
                      {p.val}
                    </text>
                    <text
                      x={p.x}
                      y={chartData.height - 8}
                      textAnchor="middle"
                      className="chart-date-text"
                    >
                      {p.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="chart-empty-state">
              <span className="empty-chart-icon">📈</span>
              <p>
                {sortedRecordsAsc.length === 1
                  ? 'Tienes 1 registro. Añade registros de otros días para visualizar tu línea de evolución.'
                  : 'Aún no hay registros de peso. Guarda tu primer registro para comenzar a graficar tu evolución.'}
              </p>
            </div>
          )}
        </div>

        {/* History Table by Date */}
        <div className="history-table-section">
          <div className="history-heading-row">
            <h3 className="sub-title">Historial de registros por fecha</h3>
            <span className="history-count-badge">
              {sortedRecordsDesc.length} {sortedRecordsDesc.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {sortedRecordsDesc.length > 0 ? (
            <div className="table-responsive-wrap">
              <table className="progress-history-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Peso (kg)</th>
                    <th>Altura (m)</th>
                    <th>IMC</th>
                    <th>Estado sugerido</th>
                    <th>Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecordsDesc.map(rec => {
                    const cat = getBMICategory(rec.bmi)
                    return (
                      <tr key={rec.id}>
                        <td className="cell-date">
                          <strong>{rec.date}</strong>
                        </td>
                        <td className="cell-num">{rec.weight} kg</td>
                        <td className="cell-num">{rec.height} m</td>
                        <td className="cell-bmi">
                          <strong>{rec.bmi}</strong>
                        </td>
                        <td>
                          <span className={`bmi-mini-pill ${cat.badgeClass}`}>{cat.label}</span>
                        </td>
                        <td className="cell-notes">{rec.notes || '—'}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn-delete-record"
                            onClick={() => setRecordToDelete(rec)}
                            title="Eliminar este registro"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-history-text">
              No tienes registros previos guardados. Completa el formulario de arriba para iniciar tu
              historial.
            </p>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={Boolean(recordToDelete)}
        title="¿Eliminar registro de peso?"
        message={`¿Estás seguro de que deseas eliminar el registro del ${recordToDelete?.date} (${recordToDelete?.weight} kg, IMC ${recordToDelete?.bmi})? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  )
}
