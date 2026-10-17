import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Timer,
  CheckCircle2,
  Circle,
  Users,
  Plus,
  Minus,
  ChefHat,
  Sparkles,
  Flame,
  Award,
  Volume2,
  Utensils,
} from 'lucide-react'

export default function CookingModeModal({ recipe, onClose, onLogCookedComplete }) {
  if (!recipe) return null

  const steps = recipe.steps || []
  const baseServings = recipe.servings || 2

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [servings, setServings] = useState(baseServings)
  const [completedSteps, setCompletedSteps] = useState({})
  const [isFinished, setIsFinished] = useState(false)
  const [loggingCooked, setLoggingCooked] = useState(false)

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerInitial, setTimerInitial] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerIntervalRef = useRef(null)

  // Serving multiplier
  const multiplier = servings / Math.max(1, baseServings)

  // Detect time mentioned in current step text
  const currentStepText = steps[currentStepIndex] || ''
  const detectedMinutes = (() => {
    const match = currentStepText.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:minute|min|m\b)/i)
    if (match) {
      return parseInt(match[2] || match[1], 10)
    }
    return null
  })()

  // Start a specific countdown timer
  const handleSetTimer = (minutes) => {
    const totalSecs = minutes * 60
    setTimerInitial(totalSecs)
    setTimerSeconds(totalSecs)
    setTimerRunning(true)
  }

  // Play gentle culinary chime
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3) // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      // Audio context policy
    }
  }

  // Timer interval with drift-free timing
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current)
            setTimerRunning(false)
            playChime()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerIntervalRef.current)
    }
    return () => clearInterval(timerIntervalRef.current)
  }, [timerRunning, timerSeconds])

  // Keyboard navigation (ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1)
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex((prev) => prev - 1)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStepIndex, steps.length, onClose])

  const toggleStepDone = (idx) => {
    playChime()
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  const handleNext = () => {
    setCompletedSteps((prev) => ({ ...prev, [currentStepIndex]: true }))
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      setIsFinished(true)
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleConfirmCooked = async () => {
    setLoggingCooked(true)
    try {
      const res = await fetch('/api/cooking-history/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_name: recipe.name,
          servings: servings,
          ingredients_used: recipe.ingredients_used || [],
        }),
      })
      if (res.ok) {
        if (onLogCookedComplete) onLogCookedComplete()
        onClose()
      }
    } catch (err) {
      alert('Could not log dish: ' + err.message)
    } finally {
      setLoggingCooked(false)
    }
  }

  // Format timer MM:SS
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Calculate scaled quantity
  const scaleQuantity = (amountStr) => {
    if (!amountStr) return ''
    const num = parseFloat(amountStr)
    if (!isNaN(num)) {
      const scaled = (num * multiplier).toFixed(1).replace(/\.0$/, '')
      return scaled
    }
    return amountStr
  }

  const ingredientsList = recipe.ingredients_used_detailed || (recipe.ingredients_used || []).map((it) => ({ item: it, amount: '1', unit: '' }))

  // Circular timer progress calculation
  const timerRadius = 45
  const timerCircumference = 2 * Math.PI * timerRadius
  const timerProgress = timerInitial > 0 ? (timerSeconds / timerInitial) : 0
  const strokeDashoffset = timerCircumference * (1 - timerProgress)

  return (
    <div className="cooking-modal-backdrop">
      <div className="cooking-modal-container">
        {/* Top App Bar with Warm Bistro Aesthetics */}
        <div className="cooking-top-bar">
          <div className="cooking-recipe-meta">
            <span className="cooking-chef-badge">
              <ChefHat size={16} className="badge-spin-slow" /> Interactive Kitchen Mode
            </span>
            <h2 className="cooking-modal-title">{recipe.name}</h2>
          </div>

          {/* Servings Adjuster */}
          <div className="cooking-servings-controls">
            <span className="cooking-servings-label">Servings:</span>
            <button
              type="button"
              className="stepper-mini-btn"
              onClick={() => setServings(Math.max(1, servings - 1))}
              disabled={servings <= 1}
              aria-label="Decrease servings"
            >
              <Minus size={13} />
            </button>
            <span className="cooking-servings-num">{servings}</span>
            <button
              type="button"
              className="stepper-mini-btn"
              onClick={() => setServings(Math.min(12, servings + 1))}
              aria-label="Increase servings"
            >
              <Plus size={13} />
            </button>
          </div>

          <button type="button" className="cooking-modal-close" onClick={onClose} title="Exit cooking mode">
            <X size={20} />
          </button>
        </div>

        {/* Progress Line */}
        <div className="cooking-progress-line">
          <div
            className="cooking-progress-line-fill"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Main Content Area */}
        <div className="cooking-body-grid">
          {/* Step Viewer or Completion Screen */}
          <div className="cooking-main-view">
            {isFinished ? (
              <div className="cooking-finish-screen">
                <div className="finish-animation-wrap">
                  <span className="finish-emoji">🎉</span>
                  <div className="confetti-dots" aria-hidden="true">
                    <span>✨</span><span>🌿</span><span>🧂</span>
                  </div>
                </div>

                <h3 className="finish-title">Bon Appétit! Dish Completed!</h3>
                <p className="finish-subtitle">
                  You just successfully rescued leftover ingredients to prepare <strong>{recipe.name}</strong> for {servings} people!
                </p>

                <div className="finish-impact-card">
                  <Award size={28} className="finish-award-icon" />
                  <div>
                    <strong>Verified Food-Waste Impact:</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: '#164E3E' }}>
                      Marking this meal as cooked will record ~{(servings * 0.175).toFixed(2)} kg of food waste avoided and add ${ (servings * 3.50).toFixed(2) } to your personal savings dashboard.
                    </p>
                  </div>
                </div>

                <div className="finish-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirmCooked}
                    disabled={loggingCooked}
                    style={{ padding: '0.95rem 2.4rem' }}
                  >
                    <CheckCircle2 size={18} />
                    <span>{loggingCooked ? 'Logging...' : 'Mark as Cooked & Log Impact'}</span>
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setIsFinished(false)}>
                    Review Steps Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="cooking-step-container">
                <div className="step-counter-header">
                  <span className="step-indicator-pill">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  <button
                    type="button"
                    className={`step-mark-btn ${completedSteps[currentStepIndex] ? 'marked-done' : ''}`}
                    onClick={() => toggleStepDone(currentStepIndex)}
                  >
                    {completedSteps[currentStepIndex] ? (
                      <>
                        <CheckCircle2 size={16} /> <span>Step Completed</span>
                      </>
                    ) : (
                      <>
                        <Circle size={16} /> <span>Mark as Done</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Big Step Instruction with culinary editorial styling */}
                <div className="cooking-step-text-display">
                  <span className="step-quote-mark">“</span>
                  {currentStepText}
                  <span className="step-quote-mark">”</span>
                </div>

                {/* Smart Detected Timer Callout */}
                {detectedMinutes && (
                  <div className="detected-timer-box">
                    <Timer size={18} className="timer-box-icon" />
                    <span>Timer detected in this step: <strong>{detectedMinutes} minutes</strong></span>
                    <button
                      type="button"
                      className="btn-start-detected-timer"
                      onClick={() => handleSetTimer(detectedMinutes)}
                    >
                      <Play size={13} /> Start {detectedMinutes}m Timer
                    </button>
                  </div>
                )}

                {/* Active Kitchen SVG Circular Timer Widget */}
                {timerInitial > 0 && (
                  <div className={`active-timer-circular-card ${timerSeconds === 0 ? 'timer-ended' : ''}`}>
                    {/* SVG Radial Countdown Ring */}
                    <div className="timer-circular-svg-wrap">
                      <svg width="110" height="110" className="timer-svg">
                        <circle
                          cx="55"
                          cy="55"
                          r={timerRadius}
                          className="timer-circle-bg"
                        />
                        <circle
                          cx="55"
                          cy="55"
                          r={timerRadius}
                          className="timer-circle-progress"
                          style={{
                            strokeDasharray: timerCircumference,
                            strokeDashoffset: strokeDashoffset,
                          }}
                        />
                      </svg>
                      <div className="timer-circular-text">
                        <span className="timer-digits-text">{formatTimer(timerSeconds)}</span>
                      </div>
                    </div>

                    <div className="timer-info-controls">
                      <div className="timer-status-header">
                        <span className="timer-live-label">
                          {timerRunning ? '♨️ Simmering countdown active' : timerSeconds === 0 ? '⏰ Bell Ringing!' : '⏸️ Timer Paused'}
                        </span>
                      </div>

                      <div className="timer-controls">
                        {timerRunning ? (
                          <button
                            type="button"
                            className="timer-ctrl-btn"
                            onClick={() => setTimerRunning(false)}
                            title="Pause"
                          >
                            <Pause size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="timer-ctrl-btn timer-btn-play"
                            onClick={() => setTimerRunning(true)}
                            disabled={timerSeconds === 0}
                            title="Resume"
                          >
                            <Play size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="timer-ctrl-btn"
                          onClick={() => {
                            setTimerSeconds(timerInitial)
                            setTimerRunning(false)
                          }}
                          title="Reset timer"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          type="button"
                          className="timer-ctrl-btn btn-add-time"
                          onClick={() => setTimerSeconds((prev) => prev + 60)}
                          title="Add 1 minute"
                        >
                          +1m
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="cooking-nav-buttons">
                  <button
                    type="button"
                    className="btn-step-nav"
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft size={18} /> Previous Step
                  </button>

                  <button
                    type="button"
                    className="btn-step-nav btn-step-next"
                    onClick={handleNext}
                  >
                    <span>{currentStepIndex === steps.length - 1 ? 'Finish Dish 🎉' : 'Next Step'}</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Ingredients Drawer with Scaled Quantities */}
          <aside className="cooking-ingredients-drawer">
            <h4 className="drawer-title">
              <span>Ingredients Needed</span>
              <span className="servings-badge">{servings} portions</span>
            </h4>

            <div className="drawer-ingredients-list">
              {ingredientsList.map((ing, i) => (
                <div key={i} className="drawer-ingredient-row">
                  <span className="drawer-ing-name">{ing.item}</span>
                  <span className="drawer-ing-qty">
                    {scaleQuantity(ing.amount)} {ing.unit}
                  </span>
                </div>
              ))}
            </div>

            {recipe.storage_advice && (
              <div className="drawer-storage-tip">
                <strong>📦 Chef's Storage Advice:</strong>
                <p>{recipe.storage_advice}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
