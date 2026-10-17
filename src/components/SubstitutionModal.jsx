import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Scale,
  ChefHat,
  Search,
  ShieldCheck,
} from 'lucide-react'

export default function SubstitutionModal({
  initialIngredient = '',
  recipeContext = '',
  dietary = 'No preference',
  allergies = [],
  onClose,
}) {
  const [ingredient, setIngredient] = useState(initialIngredient)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const fetchSubstitutes = async (ingToSearch) => {
    if (!ingToSearch.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: ingToSearch.trim(),
          recipe_context: recipeContext,
          dietary: dietary,
          allergies: allergies,
        }),
      })
      if (!res.ok) throw new Error('Could not find substitutions at this time.')
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Error finding alternatives.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialIngredient) {
      fetchSubstitutes(initialIngredient)
    }
  }, [initialIngredient])

  const handleFormSubmit = (e) => {
    e.preventDefault()
    fetchSubstitutes(ingredient)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content substitution-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              <Sparkles size={18} className="inline-icon" /> Smart Ingredient Substitutions
            </h3>
            <p className="modal-subtitle">
              Culinary alternatives tailored to your dietary preferences and allergy exclusions.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleFormSubmit} className="substitution-search-row">
          <input
            type="text"
            required
            placeholder="Type missing ingredient (e.g. egg, buttermilk, heavy cream, cornstarch)"
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
            className="input-control"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            <Search size={15} /> Find Substitute
          </button>
        </form>

        {/* Active Constraints Badge */}
        {(allergies.length > 0 || dietary !== 'No preference') && (
          <div className="substitution-constraints-badge">
            <ShieldCheck size={14} color="#2A9D8F" />
            <span>
              Respecting: <strong>{dietary}</strong>
              {allergies.length > 0 && ` · Excluded: ${allergies.join(', ')}`}
            </span>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="loading-state-card" style={{ padding: '2rem' }}>
            <div className="spinner" />
            <p>Consulting chef knowledge base for {ingredient} alternatives...</p>
          </div>
        ) : error ? (
          <div className="alert-error">
            <p>{error}</p>
          </div>
        ) : result ? (
          <div className="substitution-results">
            {result.substitutions && result.substitutions.length > 0 ? (
              <div className="substitution-cards-list">
                {result.substitutions.map((sub, idx) => (
                  <div key={idx} className="sub-item-card">
                    <div className="sub-item-header">
                      <h4 className="sub-item-name">✨ {sub.replacement}</h4>
                      <span className="sub-ratio-badge">
                        <Scale size={12} /> {sub.ratio}
                      </span>
                    </div>

                    <div className="sub-details-grid">
                      <div className="sub-detail-col">
                        <span className="sub-detail-label">Flavor & Texture Difference:</span>
                        <p className="sub-detail-text">{sub.flavor_texture}</p>
                      </div>

                      <div className="sub-detail-col">
                        <span className="sub-detail-label">Important Limitations:</span>
                        <p className="sub-detail-text">{sub.limitations}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-sub-card">
                <p>No immediate substitute found for "{ingredient}". Consider a similar pantry staple or omitting if non-essential.</p>
              </div>
            )}

            {result.disclaimer && (
              <div className="substitution-disclaimer">
                <AlertCircle size={14} />
                <span>{result.disclaimer}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
