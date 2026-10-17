import React, { useState, useEffect } from 'react'
import {
  SlidersHorizontal,
  X,
  ShieldCheck,
  ShieldAlert,
  Check,
  Plus,
  Trash2,
} from 'lucide-react'

const COMMON_ALLERGIES = [
  'Peanuts',
  'Tree nuts',
  'Dairy',
  'Eggs',
  'Gluten / Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
]

const CUISINES = ['Any', 'Italian', 'Mexican', 'Indian', 'Mediterranean', 'Asian / Stir-Fry', 'American Bistro', 'French']
const DIFFICULTIES = ['Any', 'Beginner / Easy', 'Intermediate', 'Advanced']

export default function PreferencesModal({ onClose, onPreferencesUpdated }) {
  const [prefs, setPrefs] = useState({
    dietary: 'Vegetarian',
    cuisine: 'Any',
    allergies: [],
    disliked_ingredients: [],
    max_cooking_time: '30 minutes',
    difficulty_preference: 'Any',
    default_servings: 2,
  })
  const [customAllergy, setCustomAllergy] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    fetch('/api/preferences')
      .then((res) => res.json())
      .then((data) => setPrefs(data))
      .catch((err) => console.error('Error fetching preferences:', err))
  }, [])

  const toggleAllergy = (allergy) => {
    const list = prefs.allergies || []
    if (list.includes(allergy)) {
      setPrefs({ ...prefs, allergies: list.filter((a) => a !== allergy) })
    } else {
      setPrefs({ ...prefs, allergies: [...list, allergy] })
    }
  }

  const handleAddCustomAllergy = (e) => {
    e.preventDefault()
    const clean = customAllergy.trim()
    if (!clean) return
    const list = prefs.allergies || []
    if (!list.includes(clean)) {
      setPrefs({ ...prefs, allergies: [...list, clean] })
    }
    setCustomAllergy('')
  }

  const handleRemoveAllergy = (name) => {
    setPrefs({ ...prefs, allergies: (prefs.allergies || []).filter((a) => a !== name) })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (res.ok) {
        setSaveMessage('Preferences & allergy exclusions saved successfully!')
        if (onPreferencesUpdated) onPreferencesUpdated(prefs)
        setTimeout(() => {
          onClose()
        }, 800)
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content preferences-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              <SlidersHorizontal size={18} className="inline-icon" /> Kitchen Settings & Allergy Safety
            </h3>
            <p className="modal-subtitle">
              Configure your dietary goals and hard allergy exclusions for all generated recipes and substitutions.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Allergy Safety Disclaimer */}
        <div className="safety-warning-banner" style={{ marginBottom: '1.2rem' }}>
          <ShieldAlert size={18} className="safety-warning-icon" />
          <div className="safety-warning-text" style={{ fontSize: '0.82rem' }}>
            <strong>Allergy Hard Constraints:</strong> Excluded items are strictly banned from AI recipe generation and substitutions. However, always inspect packaged food labels for factory cross-contact warnings.
          </div>
        </div>

        {saveMessage && (
          <div className="alert-info" style={{ marginBottom: '1rem' }}>
            <ShieldCheck size={18} color="#2A9D8F" />
            <span>{saveMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="modal-form">
          {/* Dietary Baseline */}
          <div className="form-group">
            <label className="form-label">Dietary Lifestyle</label>
            <select
              value={prefs.dietary}
              onChange={(e) => setPrefs({ ...prefs, dietary: e.target.value })}
              className="select-control"
            >
              <option value="Vegetarian">Vegetarian (No meat/fish)</option>
              <option value="Vegan">Vegan (100% plant-based)</option>
              <option value="Gluten-free">Gluten-free</option>
              <option value="Dairy-free">Dairy-free</option>
              <option value="Pescatarian">Pescatarian (Plant + Seafood)</option>
              <option value="No preference">No preference (Omnivore)</option>
            </select>
          </div>

          {/* Hard Allergy Exclusions */}
          <div className="form-group">
            <label className="form-label">
              <ShieldCheck size={15} color="#D84A38" /> Strict Allergy Exclusions (Hard Constraints)
            </label>
            <div className="allergies-chip-grid">
              {COMMON_ALLERGIES.map((alg) => {
                const isSelected = (prefs.allergies || []).includes(alg)
                return (
                  <button
                    key={alg}
                    type="button"
                    className={`allergy-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleAllergy(alg)}
                  >
                    <span>{isSelected ? '🚫' : '✓'}</span>
                    <span>{alg}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom Allergy Input */}
            <div className="custom-allergy-row">
              <input
                type="text"
                placeholder="Add other allergen (e.g. mushrooms, cilantro, mustard)"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                className="input-control"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddCustomAllergy}
              >
                <Plus size={14} /> Add Exclusion
              </button>
            </div>

            {/* Selected Allergies Summary */}
            {prefs.allergies && prefs.allergies.length > 0 && (
              <div className="selected-allergies-summary">
                <span className="summary-label">Active Exclusions:</span>
                <div className="summary-chips">
                  {prefs.allergies.map((a) => (
                    <span key={a} className="active-exclusion-pill">
                      <span>{a}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(a)}
                        className="exclusion-remove-btn"
                        title="Remove exclusion"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Preferred Cuisine</label>
              <select
                value={prefs.cuisine}
                onChange={(e) => setPrefs({ ...prefs, cuisine: e.target.value })}
                className="select-control"
              >
                {CUISINES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Difficulty</label>
              <select
                value={prefs.difficulty_preference}
                onChange={(e) => setPrefs({ ...prefs, difficulty_preference: e.target.value })}
                className="select-control"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
