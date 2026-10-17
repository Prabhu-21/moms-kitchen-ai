import React, { useState } from 'react'
import {
  UtensilsCrossed,
  Clock,
  Users,
  Flame,
  Zap,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
  Salad,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export default function Sidebar({
  activeTab = 'recipes',
  dietary,
  setDietary,
  cookingTime,
  setCookingTime,
  servings,
  setServings,
  prioritize,
  setPrioritize,
  cuisine = 'Any',
  setCuisine,
  difficulty = 'Any',
  setDifficulty,
  rescueMode = false,
  setRescueMode,
  allergies = [],
  modelMode,
  setModelMode,
  autoFallback,
  setAutoFallback,
  apiStatus,
  onOpenPreferences,
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const times = ['15 mins', '30 mins', '45 mins', '60+ mins']
  const timeLabels = ['15 minutes', '30 minutes', '45 minutes', '60+ minutes']

  const handleTimeChange = (index) => {
    setCookingTime(timeLabels[index])
  }

  const currentTimeIndex = Math.max(0, timeLabels.indexOf(cookingTime))

  const dietaryOptions = [
    { label: 'Vegetarian', icon: '🥗' },
    { label: 'Vegan', icon: '🌱' },
    { label: 'Gluten-free', icon: '🌾' },
    { label: 'No preference', icon: '🍽️' },
  ]

  const cuisineOptions = ['Any', 'Italian', 'Mexican', 'Indian', 'Asian', 'Mediterranean']

  return (
    <aside className={`sidebar ${activeTab !== 'recipes' ? 'sidebar-hidden-on-mobile' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      {/* Brand & Chef Station Title with Mobile Accordion Toggle */}
      <div
        className="sidebar-header"
        onClick={() => setMobileOpen(!mobileOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={mobileOpen}
      >
        <div className="chef-avatar">
          <span>👨‍🍳</span>
        </div>
        <div className="sidebar-header-text">
          <h2 className="sidebar-title">Kitchen Station</h2>
          <p className="sidebar-caption">
            <span className="caption-desktop">Custom prep & cooking constraints</span>
            <span className="caption-mobile">
              {mobileOpen ? 'Tap to collapse filters ▴' : `${dietary} · ${cookingTime} · ${servings}p · ${cuisine} ▾`}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="sidebar-mobile-toggle-btn"
          aria-label={mobileOpen ? 'Collapse kitchen settings' : 'Expand kitchen settings'}
        >
          {mobileOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div className={`sidebar-collapsible-body ${mobileOpen ? 'is-open' : ''}`}>

      {/* Rescue Mode / Priority Toggle */}
      <div className={`prioritize-card ${rescueMode ? 'prioritize-card-rescue' : ''}`}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={rescueMode || prioritize}
            onChange={(e) => {
              const val = e.target.checked
              if (setRescueMode) setRescueMode(val)
              setPrioritize(val)
            }}
          />
          <div>
            <div className="prioritize-heading">
              <Flame size={14} color="#E76F51" />
              <span>{rescueMode ? '🚨 Rescue Mode Active' : 'Prioritize Perishables First'}</span>
            </div>
            <p className="prioritize-sub">
              Focus on ingredients nearing expiration to maximize food rescued.
            </p>
          </div>
        </label>
      </div>

      {/* Dietary Preference Grid */}
      <div className="form-group">
        <label className="form-label">
          <Salad size={16} className="label-icon" /> Dietary Lifestyle
        </label>
        <div className="dietary-pills-grid">
          {dietaryOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={`dietary-pill ${dietary === opt.label ? 'active' : ''}`}
              onClick={() => setDietary(opt.label)}
            >
              <span className="dietary-emoji">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine Selector */}
      {setCuisine && (
        <div className="form-group">
          <label className="form-label">
            <Globe size={16} className="label-icon" /> Cuisine Inspiration
          </label>
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="select-control"
          >
            {cuisineOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Cooking Time Slider */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            <Clock size={16} className="label-icon" /> Time Limit
          </label>
          <span className="time-highlight-badge">{cookingTime}</span>
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={currentTimeIndex}
            onChange={(e) => handleTimeChange(parseInt(e.target.value, 10))}
            className="range-input"
          />
          <div className="slider-ticks">
            {times.map((t, idx) => (
              <span
                key={t}
                className={`tick-label ${currentTimeIndex === idx ? 'tick-active' : ''}`}
                onClick={() => handleTimeChange(idx)}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Servings Stepper */}
      <div className="form-group">
        <label className="form-label">
          <Users size={16} className="label-icon" /> Servings
        </label>
        <div className="servings-stepper">
          <button
            type="button"
            className="stepper-btn"
            onClick={() => setServings(Math.max(1, servings - 1))}
            disabled={servings <= 1}
            aria-label="Decrease servings"
          >
            <Minus size={16} />
          </button>
          <div className="servings-display">
            <span className="servings-number">{servings}</span>
            <span className="servings-text">{servings === 1 ? 'Portion' : 'Portions'}</span>
          </div>
          <button
            type="button"
            className="stepper-btn"
            onClick={() => setServings(Math.min(12, servings + 1))}
            disabled={servings >= 12}
            aria-label="Increase servings"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Allergy Safety Indicator & Preferences Button */}
      <div className="sidebar-safety-panel">
        <div className="safety-panel-header">
          <ShieldCheck size={16} color="#2A9D8F" />
          <span>Allergy Exclusions</span>
        </div>
        <p className="safety-panel-sub">
          {allergies.length > 0
            ? `Excluded: ${allergies.join(', ')}`
            : 'No strict allergy exclusions set.'}
        </p>
        <button
          type="button"
          className="btn-open-prefs-sidebar"
          onClick={onOpenPreferences}
        >
          <SlidersHorizontal size={13} />
          <span>Manage Preferences & Allergies</span>
        </button>
      </div>

      <hr className="divider" />

      {/* AI Model Engine Selector */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            <Zap size={16} color="#E76F51" className="label-icon" /> AI Engine
          </label>
          <span className="model-mode-badge">
            {modelMode === 'gemma' ? 'Gemma 4' : 'Flash'}
          </span>
        </div>

        <div className="engine-toggle-grid">
          <button
            type="button"
            className={`engine-card ${modelMode === 'gemma' ? 'active' : ''}`}
            onClick={() => setModelMode('gemma')}
          >
            <div className="engine-card-top">
              <Sparkles size={16} color="#B54F1D" />
              <span className="engine-tag-accent">Hackathon Star</span>
            </div>
            <div className="engine-name">Gemma 4</div>
            <p className="engine-desc">Gemma 4 26B instruct model</p>
          </button>

          <button
            type="button"
            className={`engine-card ${modelMode === 'flash' ? 'active' : ''}`}
            onClick={() => setModelMode('flash')}
          >
            <div className="engine-card-top">
              <Zap size={16} color="#2A9D8F" />
              <span className="engine-tag-speed">~5s Speed</span>
            </div>
            <div className="engine-name">Turbo Flash</div>
            <p className="engine-desc">High-speed instant mode</p>
          </button>
        </div>

        <label className="checkbox-label" style={{ marginTop: '0.6rem' }}>
          <input
            type="checkbox"
            checked={autoFallback}
            onChange={(e) => setAutoFallback(e.target.checked)}
          />
          <span style={{ fontSize: '0.82rem', color: '#6C5E55' }}>
            Auto-fallback to Flash if Gemma cloud queues
          </span>
        </label>
      </div>

      <hr className="divider" />

      {/* Backend API Connection Status */}
      <div className="api-status-card">
        <div className="status-row">
          <span className="status-label">API Cloud Status</span>
          {apiStatus?.has_api_key ? (
            <span className="status-pill status-pill-online">
              <span className="pulse-dot-green" /> Connected
            </span>
          ) : (
            <span className="status-pill status-pill-offline">
              <span className="pulse-dot-red" /> No Key
            </span>
          )}
        </div>
        <div className="status-model-detail">
          Target: <code>{modelMode === 'gemma' ? 'gemma-4-26b-a4b-it' : 'gemini-3.8-flash'}</code>
        </div>
      </div>
      </div>
    </aside>
  )
}
