import React, { useState } from 'react'
import {
  Clock,
  Flame,
  Check,
  ShoppingCart,
  Leaf,
  CheckCircle2,
  Circle,
  Copy,
  CheckCheck,
  ChefHat,
  Sparkles,
  Bookmark,
  ShieldCheck,
  Percent,
  Play,
  RotateCcw,
} from 'lucide-react'

export default function RecipeCard({
  recipe,
  index,
  onStartCooking,
  onSaveRecipe,
  onOpenSubstitution,
}) {
  const {
    name = `Recipe ${index}`,
    description = '',
    time_minutes = '—',
    difficulty = 'Easy',
    servings = 2,
    why_recommended = '',
    utilization_percentage = 80,
    ingredients_used = [],
    missing_ingredients = [],
    ingredients_used_detailed = [],
    missing_ingredients_detailed = [],
    steps = [],
    allergens = [],
    storage_advice = '',
    waste_reduction_tip = '',
  } = recipe

  const [completedSteps, setCompletedSteps] = useState({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleStep = (stepIdx) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepIdx]: !prev[stepIdx],
    }))
  }

  const handleCopy = () => {
    const text = [
      `👨‍🍳 ${name}`,
      description ? `"${description}"` : '',
      `⏱️ Time: ${time_minutes} mins | Difficulty: ${difficulty} | Servings: ${servings}`,
      utilization_percentage ? `🌱 Pantry Utilization: ${utilization_percentage}%` : '',
      why_recommended ? `💡 Recommended: ${why_recommended}` : '',
      `\n🥗 Ingredients Used: ${ingredients_used.join(', ')}`,
      missing_ingredients.length > 0 ? `🧂 Pantry Items / Missing: ${missing_ingredients.join(', ')}` : '',
      '\n👨‍🍳 Method:',
      ...steps.map((s, idx) => `${idx + 1}. ${s}`),
      waste_reduction_tip ? `\n🌱 Waste-Saving Tip: ${waste_reduction_tip}` : '',
      storage_advice ? `📦 Storage: ${storage_advice}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const handleSave = async () => {
    if (onSaveRecipe) {
      await onSaveRecipe(recipe)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const completedCount = Object.values(completedSteps).filter(Boolean).length
  const totalSteps = steps.length
  const allDone = totalSteps > 0 && completedCount === totalSteps

  // Standardize ingredients display
  const usedItems = ingredients_used_detailed.length > 0
    ? ingredients_used_detailed
    : ingredients_used.map((it) => ({ item: it, amount: '', unit: '' }))

  const missingItems = missing_ingredients_detailed.length > 0
    ? missing_ingredients_detailed
    : missing_ingredients.map((it) => ({ item: it, amount: '', unit: '' }))

  return (
    <article className={`recipe-card ${allDone ? 'recipe-completed' : ''}`}>
      {/* Decorative top ribbon */}
      <div className="recipe-ribbon">
        <div className="ribbon-tags-group">
          <span className="ribbon-tag">
            <ChefHat size={13} /> Dish #{index} · Chef’s Selection
          </span>
          <span
            className="utilization-badge"
            title="Pantry Utilization = (pantry_ingredients / total_ingredients) * 100"
          >
            <Percent size={12} /> {utilization_percentage}% Pantry Utilization
          </span>
        </div>

        <div className="ribbon-buttons-group">
          <button
            type="button"
            className="btn-card-top-action"
            onClick={handleSave}
            title="Save to your personal cookbook"
          >
            <Bookmark size={14} color={saved ? '#E76F51' : 'currentColor'} />
            <span>{saved ? 'Saved!' : 'Save'}</span>
          </button>

          <button
            type="button"
            className="btn-card-top-action"
            onClick={handleCopy}
            title="Copy recipe to clipboard"
          >
            {copied ? (
              <>
                <CheckCheck size={14} color="#155724" />
                <span style={{ color: '#155724' }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-start-cook-mode"
            onClick={() => onStartCooking && onStartCooking(recipe)}
            title="Open step-by-step cooking mode with timer"
          >
            <Play size={13} fill="currentColor" />
            <span>Cook Step-by-Step</span>
          </button>
        </div>
      </div>

      <div className="recipe-title-row">
        <div>
          <h3 className="recipe-title">{name}</h3>
          {description && <p className="recipe-desc">"{description}"</p>}
        </div>

        <div className="badge-bar">
          <span className="badge-pill badge-time">
            <Clock size={14} /> {time_minutes} mins
          </span>
          <span className="badge-pill badge-difficulty">
            <Flame size={14} /> {difficulty}
          </span>
        </div>
      </div>

      {/* Why Chef Recommends This Callout */}
      {why_recommended && (
        <div className="why-recommended-box">
          <Sparkles size={15} className="why-icon" />
          <span>
            <strong>Why Chef recommends this:</strong> {why_recommended}
          </span>
        </div>
      )}

      {/* Ingredients Grid with Quantities and Substitutions Trigger */}
      <div className="ingredients-grid">
        <div className="ing-column ing-col-fridge">
          <div className="ing-col-title">
            <Check size={15} className="col-icon" /> FROM YOUR PANTRY (QUANTITIES)
          </div>
          <div className="ing-tags-wrap">
            {usedItems.length > 0 ? (
              usedItems.map((ing, i) => (
                <span key={i} className="ing-tag-used">
                  <Check size={12} className="tag-icon" />
                  <span>
                    {ing.amount && `${ing.amount} ${ing.unit} `}{ing.item}
                  </span>
                </span>
              ))
            ) : (
              <span className="ing-empty">None specified</span>
            )}
          </div>
        </div>

        <div className="ing-column ing-col-pantry">
          <div className="ing-col-title">
            <ShoppingCart size={15} className="col-icon" /> STAPLES / MISSING (CLICK FOR SUBSTITUTES)
          </div>
          <div className="ing-tags-wrap">
            {missingItems.length > 0 ? (
              missingItems.map((ing, i) => (
                <button
                  key={i}
                  type="button"
                  className="ing-tag-missing btn-missing-sub"
                  onClick={() => onOpenSubstitution && onOpenSubstitution(ing.item)}
                  title={`Find substitute for ${ing.item}`}
                >
                  <ShoppingCart size={12} className="tag-icon" />
                  <span>
                    {ing.amount && `${ing.amount} ${ing.unit} `}{ing.item}
                  </span>
                  <span className="sub-hint-arrow">⇄ sub</span>
                </button>
              ))
            ) : (
              <span className="ing-empty">All ingredients ready in pantry! No extras needed.</span>
            )}
          </div>
        </div>
      </div>

      {/* Allergens warning if any */}
      {allergens.length > 0 && (
        <div className="recipe-allergens-bar">
          <ShieldCheck size={14} />
          <span>Potential Allergens: {allergens.join(', ')}</span>
        </div>
      )}

      {/* Cooking Method Section */}
      <div className="cooking-method-section">
        <div className="method-header-row">
          <div className="method-title">👨‍🍳 COOKING METHOD</div>
          {totalSteps > 0 && (
            <span className="steps-progress-pill">
              {completedCount}/{totalSteps} steps completed
            </span>
          )}
        </div>

        <div className="steps-list">
          {steps && steps.length > 0 ? (
            steps.map((step, idx) => {
              const isChecked = !!completedSteps[idx]
              return (
                <div
                  key={idx}
                  className={`step-item ${isChecked ? 'step-done' : ''}`}
                  onClick={() => toggleStep(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleStep(idx)
                  }}
                  title="Click to mark step completed"
                >
                  <button type="button" className="step-check-btn" aria-label="Toggle step">
                    {isChecked ? (
                      <CheckCircle2 size={20} className="step-icon-checked" />
                    ) : (
                      <Circle size={20} className="step-icon-unchecked" />
                    )}
                  </button>
                  <span className="step-number-badge">{idx + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              )
            })
          ) : (
            <p className="no-steps">No cooking steps provided.</p>
          )}
        </div>
      </div>

      {/* Chef's Zero-Waste Tip & Storage Advice */}
      <div className="recipe-footer-tips">
        {waste_reduction_tip && (
          <div className="chef-tip-card">
            <div className="tip-header">
              <Leaf size={16} className="tip-leaf" />
              <span>Chef’s Zero-Waste Tip</span>
            </div>
            <p className="tip-content">{waste_reduction_tip}</p>
          </div>
        )}

        {storage_advice && (
          <div className="storage-advice-card">
            <strong>📦 Storage Advice:</strong> {storage_advice}
          </div>
        )}
      </div>
    </article>
  )
}
