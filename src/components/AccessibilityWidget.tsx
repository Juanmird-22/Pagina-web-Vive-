import { useEffect, useState, useRef } from 'react'
import type { AccessibilitySettings } from '../types'

const STORAGE_KEY = 'vive_a11y_settings'

const DEFAULT_SETTINGS: AccessibilitySettings = {
  textScale: 1, // 1 = 100%, 1.15 = 115%, 1.30 = 130%
  highContrast: false,
  reduceMotion: false,
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS
  })

  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Apply settings to document element
  useEffect(() => {
    const root = document.documentElement

    // Font size scaling
    if (settings.textScale === 1.3) {
      root.classList.remove('font-scale-lg')
      root.classList.add('font-scale-xl')
    } else if (settings.textScale === 1.15) {
      root.classList.remove('font-scale-xl')
      root.classList.add('font-scale-lg')
    } else {
      root.classList.remove('font-scale-lg', 'font-scale-xl')
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Reduced motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings])

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const changeTextScale = (scale: number) => {
    setSettings(curr => ({ ...curr, textScale: scale }))
  }

  const toggleHighContrast = () => {
    setSettings(curr => ({ ...curr, highContrast: !curr.highContrast }))
  }

  const toggleReduceMotion = () => {
    setSettings(curr => ({ ...curr, reduceMotion: !curr.reduceMotion }))
  }

  const resetAll = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  const hasModifications =
    settings.textScale !== 1 || settings.highContrast || settings.reduceMotion

  return (
    <div className="a11y-widget-container">
      {/* Floating button */}
      <button
        ref={buttonRef}
        type="button"
        className={`a11y-floating-btn ${open ? 'a11y-floating-btn--active' : ''} ${
          hasModifications ? 'a11y-floating-btn--has-active' : ''
        }`}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Opciones de accesibilidad"
        aria-expanded={open}
        title="Opciones de accesibilidad"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="a11y-icon"
        >
          {/* Universal Accessibility / Human figure */}
          <circle cx="12" cy="4" r="2" />
          <path d="M4 8h16" />
          <path d="M12 8v7" />
          <path d="m8 20 4-5 4 5" />
        </svg>
        <span className="a11y-btn-text">Accesibilidad</span>
        {hasModifications && <span className="a11y-badge" title="Ajustes activos">●</span>}
      </button>

      {/* Popover Menu */}
      {open && (
        <div
          ref={menuRef}
          className="a11y-menu"
          role="region"
          aria-label="Panel de accesibilidad"
        >
          <div className="a11y-menu-header">
            <div className="a11y-title-wrap">
              <span className="a11y-title-icon">♿</span>
              <div>
                <h3>Accesibilidad</h3>
                <small>Adapta la vista a tus necesidades</small>
              </div>
            </div>
            <button
              type="button"
              className="a11y-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú de accesibilidad"
            >
              ×
            </button>
          </div>

          <div className="a11y-options-list">
            {/* 1. Aumentar tamaño del texto */}
            <div className="a11y-option-item">
              <div className="a11y-option-header">
                <span className="a11y-option-icon">🔤</span>
                <div className="a11y-option-text">
                  <strong>Tamaño del texto</strong>
                  <small>Aumenta o disminuye la letra</small>
                </div>
              </div>
              <div className="a11y-size-selector">
                <button
                  type="button"
                  className={`a11y-size-btn ${settings.textScale === 1 ? 'active' : ''}`}
                  onClick={() => changeTextScale(1)}
                  aria-pressed={settings.textScale === 1}
                >
                  <span style={{ fontSize: '13px' }}>A</span>
                  <small>Normal</small>
                </button>
                <button
                  type="button"
                  className={`a11y-size-btn ${settings.textScale === 1.15 ? 'active' : ''}`}
                  onClick={() => changeTextScale(1.15)}
                  aria-pressed={settings.textScale === 1.15}
                >
                  <span style={{ fontSize: '16px' }}>A+</span>
                  <small>Grande</small>
                </button>
                <button
                  type="button"
                  className={`a11y-size-btn ${settings.textScale === 1.3 ? 'active' : ''}`}
                  onClick={() => changeTextScale(1.3)}
                  aria-pressed={settings.textScale === 1.3}
                >
                  <span style={{ fontSize: '19px' }}>A++</span>
                  <small>Muy grande</small>
                </button>
              </div>
            </div>

            {/* 2. Alto contraste */}
            <div className="a11y-option-item a11y-option-item--toggle">
              <div className="a11y-option-header">
                <span className="a11y-option-icon">🌓</span>
                <div className="a11y-option-text">
                  <strong>Alto contraste</strong>
                  <small>Colores oscuros y bordes definidos</small>
                </div>
              </div>
              <button
                type="button"
                className={`switch ${settings.highContrast ? 'switch--on' : ''}`}
                onClick={toggleHighContrast}
                aria-pressed={settings.highContrast}
                aria-label="Activar o desactivar alto contraste"
              >
                <span />
              </button>
            </div>

            {/* 3. Reducir animaciones */}
            <div className="a11y-option-item a11y-option-item--toggle">
              <div className="a11y-option-header">
                <span className="a11y-option-icon">⏸️</span>
                <div className="a11y-option-text">
                  <strong>Reducir animaciones</strong>
                  <small>Disminuye movimientos y transiciones</small>
                </div>
              </div>
              <button
                type="button"
                className={`switch ${settings.reduceMotion ? 'switch--on' : ''}`}
                onClick={toggleReduceMotion}
                aria-pressed={settings.reduceMotion}
                aria-label="Activar o desactivar reducción de animaciones"
              >
                <span />
              </button>
            </div>
          </div>

          {hasModifications && (
            <div className="a11y-menu-footer">
              <button
                type="button"
                className="a11y-reset-btn"
                onClick={resetAll}
              >
                Restablecer ajustes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
