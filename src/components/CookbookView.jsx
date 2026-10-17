import React, { useState, useEffect } from 'react'
import {
  Bookmark,
  Heart,
  Star,
  Search,
  ChefHat,
  Clock,
  Flame,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
} from 'lucide-react'

export default function CookbookView({ onOpenCookingMode }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteText, setNoteText] = useState('')

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const url = `/api/saved-recipes?search=${encodeURIComponent(search)}&favorites_only=${favoritesOnly}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecipes(data)
      }
    } catch (err) {
      console.error('Error fetching saved recipes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [favoritesOnly])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchRecipes()
  }

  const handleToggleFavorite = async (id) => {
    try {
      const res = await fetch(`/api/saved-recipes/${id}/favorite`, { method: 'POST' })
      if (res.ok) fetchRecipes()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRate = async (id, stars) => {
    try {
      const res = await fetch(`/api/saved-recipes/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars }),
      })
      if (res.ok) fetchRecipes()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSaveNote = async (id) => {
    try {
      const target = recipes.find((r) => r.id === id)
      const res = await fetch(`/api/saved-recipes/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: target?.rating || 0, notes: noteText }),
      })
      if (res.ok) {
        setEditingNoteId(null)
        fetchRecipes()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUnsave = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your cookbook?`)) return
    try {
      const res = await fetch(`/api/saved-recipes/${id}`, { method: 'DELETE' })
      if (res.ok) fetchRecipes()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            <Bookmark size={24} className="inline-icon" /> Your Personal Cookbook
          </h2>
          <p className="view-subtitle">
            Bookmarked leftover creations, personalized star ratings, kitchen notes, and cooking history.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="pantry-controls-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search saved recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button type="button" className="search-clear-btn" onClick={() => { setSearch(''); fetchRecipes() }}>
              <X size={14} />
            </button>
          )}
        </form>

        <div className="pantry-controls-row">
          <button
            type="button"
            className={`btn-toggle-filter ${favoritesOnly ? 'active' : ''}`}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Heart size={14} fill={favoritesOnly ? '#E76F51' : 'none'} />
            <span>{favoritesOnly ? 'Showing Favorites Only' : 'Filter Favorites'}</span>
          </button>
        </div>
      </div>

      {/* Recipes Grid */}
      {loading ? (
        <div className="loading-state-card">
          <div className="spinner" />
          <p>Opening your cookbook...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state-card">
          <span className="empty-state-icon">📖</span>
          <h3 className="empty-state-title">No saved recipes yet</h3>
          <p className="empty-state-sub">
            Generate recipes from your leftover ingredients and click <strong>Save to Cookbook</strong> on any dish you love.
          </p>
        </div>
      ) : (
        <div className="cookbook-grid">
          {recipes.map((item) => {
            const recipe = item.recipe || {}
            const isEditingNote = editingNoteId === item.id

            return (
              <div key={item.id} className="cookbook-card">
                <div className="cookbook-card-top">
                  <div className="cookbook-time-badge">
                    <Clock size={13} /> {recipe.time_minutes || 25} mins
                  </div>
                  <button
                    type="button"
                    className="btn-favorite-heart"
                    onClick={() => handleToggleFavorite(item.id)}
                    title={item.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
                  >
                    <Heart
                      size={18}
                      color={item.is_favorite ? '#E76F51' : '#9E8D81'}
                      fill={item.is_favorite ? '#E76F51' : 'none'}
                    />
                  </button>
                </div>

                <h3 className="cookbook-recipe-name">{item.name}</h3>
                {recipe.description && (
                  <p className="cookbook-recipe-desc">"{recipe.description}"</p>
                )}

                {/* Star Rating */}
                <div className="cookbook-rating-row">
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="star-btn"
                        onClick={() => handleRate(item.id, s)}
                        title={`Rate ${s} stars`}
                      >
                        <Star
                          size={16}
                          color={s <= (item.rating || 0) ? '#F4A261' : '#D5C4B4'}
                          fill={s <= (item.rating || 0) ? '#F4A261' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                  {item.times_cooked > 0 && (
                    <span className="times-cooked-badge">
                      🍳 Cooked {item.times_cooked} {item.times_cooked === 1 ? 'time' : 'times'}
                    </span>
                  )}
                </div>

                {/* Notes Section */}
                <div className="cookbook-notes-box">
                  {isEditingNote ? (
                    <div className="note-edit-wrap">
                      <textarea
                        rows="2"
                        className="note-textarea"
                        placeholder="Add cooking tips, family reactions, spice tweaks..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        autoFocus
                      />
                      <div className="note-actions">
                        <button
                          type="button"
                          className="btn-save-note"
                          onClick={() => handleSaveNote(item.id)}
                        >
                          <Check size={13} /> Save Note
                        </button>
                        <button
                          type="button"
                          className="btn-cancel-note"
                          onClick={() => setEditingNoteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="note-display"
                      onClick={() => {
                        setEditingNoteId(item.id)
                        setNoteText(item.notes || '')
                      }}
                      role="button"
                      tabIndex={0}
                      title="Click to edit chef notes"
                    >
                      <span className="note-text">
                        {item.notes ? `📝 "${item.notes}"` : '+ Add chef notes...'}
                      </span>
                      <Edit3 size={12} className="note-edit-icon" />
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="cookbook-card-actions">
                  <button
                    type="button"
                    className="btn-cook-now"
                    onClick={() => onOpenCookingMode && onOpenCookingMode(recipe)}
                  >
                    <ChefHat size={15} />
                    <span>Start Cooking</span>
                  </button>
                  <button
                    type="button"
                    className="btn-unsave"
                    onClick={() => handleUnsave(item.id, item.name)}
                    title="Remove from cookbook"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
