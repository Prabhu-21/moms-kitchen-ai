import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Plus,
  Trash2,
  ShoppingCart,
  ChefHat,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react'

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']

export default function MealPlannerView({ onNavigateToShopping, onOpenCookRecipe }) {
  const [plans, setPlans] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState({ date: '', slot: 'dinner' })
  const [formData, setFormData] = useState({
    recipe_name: '',
    selected_saved_id: '',
    servings: 2,
  })
  const [compiling, setCompiling] = useState(false)
  const [compileSuccess, setCompileSuccess] = useState('')

  // Generate current 7 days
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: i === 0,
    }
  })

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/meal-plans')
      if (res.ok) {
        const data = await res.json()
        setPlans(data)
      }
      const savedRes = await fetch('/api/saved-recipes')
      if (savedRes.ok) {
        const sData = await savedRes.json()
        setSavedRecipes(sData)
      }
    } catch (err) {
      console.error('Error fetching meal plans:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleOpenAddForSlot = (dateStr, slot) => {
    setSelectedSlot({ date: dateStr, slot })
    setFormData({ recipe_name: '', selected_saved_id: '', servings: 2 })
    setShowAddModal(true)
  }

  const handleSelectSavedChange = (id) => {
    const found = savedRecipes.find((r) => r.id === parseInt(id, 10))
    if (found) {
      setFormData({
        ...formData,
        selected_saved_id: id,
        recipe_name: found.name,
      })
    } else {
      setFormData({ ...formData, selected_saved_id: id })
    }
  }

  const handleSaveMealPlan = async (e) => {
    e.preventDefault()
    if (!formData.recipe_name.trim()) return

    let recipeObj = null
    if (formData.selected_saved_id) {
      const found = savedRecipes.find((r) => r.id === parseInt(formData.selected_saved_id, 10))
      if (found) recipeObj = found.recipe
    }

    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedSlot.date,
          meal_slot: selectedSlot.slot,
          recipe_name: formData.recipe_name,
          recipe: recipeObj,
          servings: formData.servings,
        }),
      })
      if (!res.ok) throw new Error('Failed to save meal plan')
      setShowAddModal(false)
      fetchPlans()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeletePlan = async (id) => {
    try {
      const res = await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete planned meal')
      fetchPlans()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleGenerateShoppingList = async () => {
    setCompiling(true)
    setCompileSuccess('')
    try {
      const res = await fetch('/api/shopping-list/generate-from-planner', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setCompileSuccess(`Generated shopping list! ${data.items_added} missing pantry staples compiled.`)
        setTimeout(() => {
          if (onNavigateToShopping) onNavigateToShopping()
        }, 1200)
      }
    } catch (err) {
      alert('Could not compile shopping list: ' + err.message)
    } finally {
      setCompiling(false)
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            <Calendar size={24} className="inline-icon" /> Weekly Meal Planner
          </h2>
          <p className="view-subtitle">
            Schedule upcoming dishes, minimize food waste, and automatically sync missing ingredients to your shopping list.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerateShoppingList}
            disabled={compiling || plans.length === 0}
            title="Calculate missing ingredients minus your pantry stock"
          >
            <ShoppingCart size={16} />
            <span>{compiling ? 'Compiling...' : 'Generate Shopping List'}</span>
          </button>
        </div>
      </div>

      {compileSuccess && (
        <div className="alert-info" style={{ animation: 'slideUpFade 0.2s' }}>
          <CheckCircle2 size={18} color="#2A9D8F" />
          <span>{compileSuccess}</span>
        </div>
      )}

      {/* Week Calendar Grid */}
      <div className="meal-planner-grid">
        {weekDays.map((day) => {
          const dayPlans = plans.filter((p) => p.date === day.dateStr)

          return (
            <div key={day.dateStr} className={`planner-day-col ${day.isToday ? 'today-col' : ''}`}>
              <div className="planner-day-header">
                <span className="planner-day-name">{day.dayName}</span>
                <span className="planner-day-date">{day.formattedDate}</span>
                {day.isToday && <span className="today-badge">Today</span>}
              </div>

              <div className="planner-slots-list">
                {MEAL_SLOTS.map((slot) => {
                  const mealInSlot = dayPlans.find((p) => p.meal_slot.toLowerCase() === slot)

                  return (
                    <div key={slot} className="planner-slot-card">
                      <div className="planner-slot-title">
                        <span>{slot.toUpperCase()}</span>
                        {!mealInSlot && (
                          <button
                            type="button"
                            className="btn-add-meal-slot"
                            onClick={() => handleOpenAddForSlot(day.dateStr, slot)}
                            title={`Plan ${slot}`}
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>

                      {mealInSlot ? (
                        <div className="planned-meal-badge">
                          <div className="planned-meal-info">
                            <span className="planned-meal-name" title={mealInSlot.recipe_name}>
                              {mealInSlot.recipe_name}
                            </span>
                            <span className="planned-meal-servings">
                              {mealInSlot.servings} portions
                            </span>
                          </div>
                          <div className="planned-meal-actions">
                            {mealInSlot.recipe && (
                              <button
                                type="button"
                                className="btn-slot-action"
                                onClick={() => onOpenCookRecipe && onOpenCookRecipe(mealInSlot.recipe)}
                                title="Cook this meal now"
                              >
                                <ChefHat size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-slot-action btn-slot-delete"
                              onClick={() => handleDeletePlan(mealInSlot.id)}
                              title="Remove from plan"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="planner-slot-empty"
                          onClick={() => handleOpenAddForSlot(day.dateStr, slot)}
                        >
                          <span>+ Plan {slot}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Meal Plan Dialog */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                📅 Plan Meal for {selectedSlot.date} ({selectedSlot.slot.toUpperCase()})
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMealPlan} className="modal-form">
              {savedRecipes.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Choose from Your Saved Cookbook</label>
                  <select
                    value={formData.selected_saved_id}
                    onChange={(e) => handleSelectSavedChange(e.target.value)}
                    className="select-control"
                  >
                    <option value="">-- Or type a custom dish below --</option>
                    {savedRecipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.recipe?.time_minutes || 25} mins)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leftover Vegetable Curry, Pasta Primavera"
                  value={formData.recipe_name}
                  onChange={(e) => setFormData({ ...formData, recipe_name: e.target.value })}
                  className="input-control"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Servings (People)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value, 10) || 2 })}
                  className="input-control"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
