import React, { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  Search,
  Filter,
  Flame,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles,
  ShieldAlert,
  ArrowUpDown,
  X,
} from 'lucide-react'

const CATEGORIES = [
  'All',
  'Produce',
  'Dairy & Eggs',
  'Grains & Pasta',
  'Bakery',
  'Proteins',
  'Pantry & Spices',
  'Canned & Preserved',
  'Other',
]

const COMMON_UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'cups', 'tbsp', 'tsp', 'slices', 'can', 'bag']

const QUICK_PANTRY_PRESETS = [
  { name: 'Cooked Rice', quantity: 2, unit: 'cups', category: 'Grains & Pasta', days: 2, emoji: '🍚' },
  { name: 'Boiled Potatoes', quantity: 3, unit: 'pcs', category: 'Produce', days: 3, emoji: '🥔' },
  { name: 'Sliced Bread', quantity: 4, unit: 'slices', category: 'Bakery', days: 2, emoji: '🍞' },
  { name: 'Ripe Tomatoes', quantity: 2, unit: 'pcs', category: 'Produce', days: 3, emoji: '🍅' },
  { name: 'Eggs', quantity: 4, unit: 'pcs', category: 'Dairy & Eggs', days: 7, emoji: '🥚' },
  { name: 'Cheddar Cheese', quantity: 150, unit: 'g', category: 'Dairy & Eggs', days: 5, emoji: '🧀' },
  { name: 'Canned Beans', quantity: 1, unit: 'can', category: 'Canned & Preserved', days: 14, emoji: '🥫' },
  { name: 'Fresh Spinach', quantity: 100, unit: 'g', category: 'Produce', days: 2, emoji: '🥬' },
]

export default function PantryView({ onRescueToRecipes, onRefreshStats }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('expiry')
  const [rescueOnly, setRescueOnly] = useState(false)
  const [addingPreset, setAddingPreset] = useState(false)

  // Dialog state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'pcs',
    category: 'Produce',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  })

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const url = `/api/pantry?category=${encodeURIComponent(selectedCategory)}&search=${encodeURIComponent(search)}&sort_by=${sortBy}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Could not load pantry items.')
      const data = await res.json()
      setItems(data)
    } catch (err) {
      setError(err.message || 'Error fetching pantry items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [selectedCategory, sortBy])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchItems()
  }

  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      quantity: 1,
      unit: 'pcs',
      category: selectedCategory !== 'All' ? selectedCategory : 'Produce',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
    })
    setShowModal(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      purchase_date: item.purchase_date || '',
      expiry_date: item.expiry_date || '',
    })
    setShowModal(true)
  }

  const handleSaveItem = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      if (editingItem) {
        const res = await fetch(`/api/pantry/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to update pantry item.')
      } else {
        const res = await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to add pantry item.')
      }
      setShowModal(false)
      fetchItems()
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your pantry?`)) return
    try {
      const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete item.')
      fetchItems()
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleConsumeItem = async (id, name) => {
    try {
      const res = await fetch(`/api/pantry/${id}/consume`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to log consumption.')
      fetchItems()
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      alert(err.message)
    }
  }

  // Filter items if Rescue Mode toggle active
  const displayedItems = rescueOnly
    ? items.filter((it) => ['critical', 'urgent', 'expired'].includes(it.urgency))
    : items

  const urgentCount = items.filter((it) => ['critical', 'urgent'].includes(it.urgency)).length
  const expiredCount = items.filter((it) => it.urgency === 'expired').length

  const handleSendToRecipeEngine = () => {
    const rescueList = items
      .filter((it) => ['critical', 'urgent'].includes(it.urgency) || (it.days_left !== null && it.days_left <= 3))
      .map((it) => it.name)

    const listToSend = rescueList.length > 0 ? rescueList : items.map((it) => it.name).slice(0, 5)
    if (onRescueToRecipes) {
      onRescueToRecipes(listToSend, true)
    }
  }

  const getUrgencyBadge = (item) => {
    const { urgency, days_left } = item
    if (urgency === 'expired') {
      return (
        <span className="pantry-badge badge-expired">
          <AlertTriangle size={12} /> Expired ({Math.abs(days_left)}d ago)
        </span>
      )
    }
    if (urgency === 'critical') {
      return (
        <span className="pantry-badge badge-critical">
          <Flame size={12} /> {days_left === 0 ? 'Expires Today!' : 'Expires Tomorrow!'}
        </span>
      )
    }
    if (urgency === 'urgent') {
      return (
        <span className="pantry-badge badge-urgent">
          <Flame size={12} /> {days_left} days left
        </span>
      )
    }
    if (urgency === 'approaching') {
      return (
        <span className="pantry-badge badge-approaching">
          <Calendar size={12} /> {days_left} days left
        </span>
      )
    }
    return (
      <span className="pantry-badge badge-fresh">
        <CheckCircle2 size={12} /> {days_left ? `${days_left}d shelf life` : 'Fresh'}
      </span>
    )
  }

  const handleAddPreset = async (preset) => {
    try {
      setAddingPreset(true)
      const expDate = new Date(Date.now() + preset.days * 86400000).toISOString().split('T')[0]
      const payload = {
        name: preset.name,
        quantity: preset.quantity,
        unit: preset.unit,
        category: preset.category,
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: expDate,
      }
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to add preset ingredient.')
      await fetchItems()
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      alert(err.message)
    } finally {
      setAddingPreset(false)
    }
  }

  const getFreshnessGauge = (item) => {
    const { urgency, days_left } = item
    let percent = 85
    let fillClass = 'fill-fresh'

    if (urgency === 'expired') {
      percent = 100
      fillClass = 'fill-expired'
    } else if (urgency === 'critical') {
      percent = 15
      fillClass = 'fill-critical'
    } else if (urgency === 'urgent') {
      percent = 35
      fillClass = 'fill-urgent'
    } else if (urgency === 'approaching') {
      percent = 65
      fillClass = 'fill-approaching'
    } else {
      percent = 95
      fillClass = 'fill-fresh'
    }

    return (
      <div className="pantry-card-freshness-gauge">
        <div className="freshness-gauge-labels">
          <span>Freshness Meter</span>
          <span>
            {days_left !== null
              ? days_left < 0
                ? `${Math.abs(days_left)}d overdue`
                : days_left === 0
                ? 'Expires today'
                : `${days_left}d left`
              : 'Shelf stable'}
          </span>
        </div>
        <div
          className="freshness-track"
          title={`Estimated freshness: ${days_left !== null ? days_left + ' days remaining' : 'Shelf stable'}`}
        >
          <div className={`freshness-bar-fill ${fillClass}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">
            <Package size={24} className="inline-icon" /> Smart Pantry & Expiry Tracker
          </h2>
          <p className="view-subtitle">
            Keep track of what's in your fridge, catch ingredients before they spoil, and trigger Rescue Mode.
          </p>
        </div>

        <div className="view-header-actions">
          <button type="button" className="btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Ingredient
          </button>
          <button
            type="button"
            className={`btn-rescue-hero ${urgentCount > 0 ? 'btn-rescue-active' : ''}`}
            onClick={handleSendToRecipeEngine}
            disabled={items.length === 0}
            title="Generate 3 recipes using expiring ingredients"
          >
            <Flame size={16} />
            <span>Rescue Mode ({urgentCount || items.length})</span>
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="safety-warning-banner">
        <ShieldAlert size={20} className="safety-warning-icon" />
        <div className="safety-warning-text">
          <strong>Food Safety Advisory:</strong> Expiry dates are estimates. Do not consume food that exhibits mold, sour odor, slime, or discoloration, even if the date has not passed. Always cook leftovers to safe internal temperatures.
        </div>
      </div>

      {/* Expiry Overview Strip */}
      <div className="pantry-stats-strip">
        <div className="stat-card">
          <span className="stat-label">Total Ingredients</span>
          <span className="stat-value">{items.length}</span>
        </div>
        <div className={`stat-card ${urgentCount > 0 ? 'stat-urgent' : ''}`}>
          <span className="stat-label">🚨 Expiring Soon (≤3d)</span>
          <span className="stat-value">{urgentCount}</span>
        </div>
        <div className={`stat-card ${expiredCount > 0 ? 'stat-expired' : ''}`}>
          <span className="stat-label">⚠️ Expired (Check Freshness)</span>
          <span className="stat-value">{expiredCount}</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="pantry-controls-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search ingredients in your pantry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button type="button" className="search-clear-btn" onClick={() => { setSearch(''); fetchItems() }}>
              <X size={14} />
            </button>
          )}
        </form>

        <div className="pantry-controls-row">
          <div className="category-scroll-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="sort-filter-actions">
            <button
              type="button"
              className={`btn-toggle-filter ${rescueOnly ? 'active' : ''}`}
              onClick={() => setRescueOnly(!rescueOnly)}
            >
              <Flame size={14} />
              <span>{rescueOnly ? 'Showing Urgent Only' : 'Use It First'}</span>
            </button>

            <div className="sort-dropdown-wrap">
              <ArrowUpDown size={14} className="sort-icon" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-sort"
              >
                <option value="expiry">Sort: Expiry (Soonest first)</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="recent">Sort: Recently Added</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Starter Common Leftovers Strip */}
      <div className="quick-starter-section">
        <div className="quick-starter-header">
          <span className="quick-starter-title">
            <Sparkles size={14} style={{ color: '#E76F51' }} /> Quick Kitchen Shortcuts (1-Tap Add)
          </span>
          <span className="quick-starter-hint">Tap any staple to pre-populate your pantry</span>
        </div>
        <div className="quick-starter-strip">
          {QUICK_PANTRY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="quick-starter-pill"
              onClick={() => handleAddPreset(preset)}
              disabled={addingPreset}
              title={`Add ${preset.quantity} ${preset.unit} of ${preset.name} (${preset.days}d expiry)`}
            >
              <span>{preset.emoji}</span>
              <span>{preset.name}</span>
              <span className="pill-add-symbol">+</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pantry Items Grid / Table */}
      {loading ? (
        <div className="loading-state-card">
          <div className="spinner" />
          <p>Scanning pantry shelves...</p>
        </div>
      ) : error ? (
        <div className="alert-error">
          <p>{error}</p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="empty-state-card">
          <span className="empty-state-icon">🥫</span>
          <h3 className="empty-state-title">
            {rescueOnly ? 'No urgent items right now!' : 'Your pantry is waiting to be filled!'}
          </h3>
          <p className="empty-state-sub">
            {rescueOnly
              ? 'Great news! None of your ingredients are in immediate danger of expiring.'
              : 'Add leftover ingredients, groceries, or snap a photo with the scanner to begin.'}
          </p>
          <button type="button" className="btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add First Ingredient
          </button>
        </div>
      ) : (
        <div className="pantry-items-grid">
          {displayedItems.map((item) => (
            <div key={item.id} className={`pantry-card pantry-card-${item.urgency}`}>
              <div className="pantry-card-top">
                <span className="pantry-category-tag">{item.category}</span>
                {getUrgencyBadge(item)}
              </div>

              <h4 className="pantry-item-name">{item.name}</h4>

              <div className="pantry-item-qty">
                <span className="qty-number">{item.quantity}</span>
                <span className="qty-unit">{item.unit}</span>
              </div>

              {/* Freshness Gauge Meter */}
              {getFreshnessGauge(item)}

              <div className="pantry-card-dates">
                {item.expiry_date ? (
                  <span>📅 Expiry: <strong>{item.expiry_date}</strong></span>
                ) : (
                  <span className="no-date">No expiry date specified</span>
                )}
              </div>

              <div className="pantry-card-actions">
                <button
                  type="button"
                  className="btn-card-action btn-consume"
                  onClick={() => handleConsumeItem(item.id, item.name)}
                  title="Mark as cooked or eaten (counts towards waste avoided)"
                >
                  <CheckCircle2 size={14} />
                  <span>Consumed</span>
                </button>
                <button
                  type="button"
                  className="btn-card-action btn-edit"
                  onClick={() => handleOpenEdit(item)}
                  title="Edit ingredient details"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  className="btn-card-action btn-delete"
                  onClick={() => handleDeleteItem(item.id, item.name)}
                  title="Delete ingredient"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Ingredient Modal Dialog */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingItem ? '✏️ Edit Pantry Ingredient' : '🥫 Add Ingredient to Pantry'}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="modal-form">
              <div className="form-group">
                <label className="form-label">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baby Spinach, Greek Yogurt, Cheddar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-control"
                  autoFocus
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })}
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="select-control"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="select-control"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="input-control"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Save Changes' : 'Add to Pantry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
