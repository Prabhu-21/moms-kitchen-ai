import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Hero from './components/Hero'
import Inspirations from './components/Inspirations'
import RecipeCard from './components/RecipeCard'
import SurplusSection from './components/SurplusSection'
import PantryView from './components/PantryView'
import MealPlannerView from './components/MealPlannerView'
import ShoppingListView from './components/ShoppingListView'
import CookbookView from './components/CookbookView'
import AnalyticsView from './components/AnalyticsView'
import CookingModeModal from './components/CookingModeModal'
import SubstitutionModal from './components/SubstitutionModal'
import PreferencesModal from './components/PreferencesModal'
import ImageScannerModal from './components/ImageScannerModal'

import {
  Sparkles,
  AlertCircle,
  Info,
  ChefHat,
  X,
  Trash2,
  UtensilsCrossed,
  Zap,
  Flame,
  ShieldCheck,
} from 'lucide-react'

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('recipes')

  // Core Kitchen Preferences & State
  const [ingredientsInput, setIngredientsInput] = useState('')
  const [dietary, setDietary] = useState('Vegetarian')
  const [cuisine, setCuisine] = useState('Any')
  const [difficulty, setDifficulty] = useState('Any')
  const [cookingTime, setCookingTime] = useState('30 minutes')
  const [servings, setServings] = useState(2)
  const [prioritize, setPrioritize] = useState(true)
  const [rescueMode, setRescueMode] = useState(false)
  const [allergies, setAllergies] = useState([])
  const [modelMode, setModelMode] = useState('gemma')
  const [autoFallback, setAutoFallback] = useState(true)

  // Recipe Generation State
  const [loading, setLoading] = useState(false)
  const [cookingStepText, setCookingStepText] = useState('')
  const [cookingProgress, setCookingProgress] = useState(15)
  const [error, setError] = useState('')
  const [recipesData, setRecipesData] = useState(null)
  const [apiStatus, setApiStatus] = useState(null)
  const [rescueCount, setRescueCount] = useState(0)

  // Modals
  const [activeCookingRecipe, setActiveCookingRecipe] = useState(null)
  const [substitutionIngredient, setSubstitutionIngredient] = useState(null)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [showImageScannerModal, setShowImageScannerModal] = useState(false)

  // Fetch backend status, preferences, and pantry rescue count
  const refreshPantryRescueCount = async () => {
    try {
      const res = await fetch('/api/pantry/rescue')
      if (res.ok) {
        const data = await res.json()
        setRescueCount(data.length)
      }
    } catch (e) {
      console.warn('Could not fetch rescue items count:', e)
    }
  }

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setApiStatus(data))
      .catch((err) => console.warn('Could not fetch /api/config:', err))

    fetch('/api/preferences')
      .then((res) => res.json())
      .then((prefs) => {
        if (prefs.dietary) setDietary(prefs.dietary)
        if (prefs.cuisine) setCuisine(prefs.cuisine)
        if (prefs.allergies) setAllergies(prefs.allergies)
        if (prefs.max_cooking_time) setCookingTime(prefs.max_cooking_time)
        if (prefs.default_servings) setServings(prefs.default_servings)
      })
      .catch((err) => console.warn('Could not fetch preferences:', err))

    refreshPantryRescueCount()
  }, [])

  const parseIngredients = (text) => {
    if (!text) return []
    const cleaned = text.replace(/\n/g, ',').replace(/;/g, ',')
    const regexCleaned = cleaned.replace(/\b(and|&)\b/gi, ',')
    return regexCleaned
      .split(',')
      .map((item) => item.trim().replace(/^[-*•]+/, '').trim())
      .filter((item) => item.length > 1)
  }

  const parsedIngredients = parseIngredients(ingredientsInput)

  const handleRemoveIngredient = (ingToRemove) => {
    const remaining = parsedIngredients.filter(
      (item) => item.toLowerCase() !== ingToRemove.toLowerCase()
    )
    setIngredientsInput(remaining.join(', '))
  }

  const handleClearAll = () => {
    setIngredientsInput('')
  }

  const handleCraftRecipes = async (overrideIngredients = null) => {
    setError('')
    const ingredientsToUse = overrideIngredients || parsedIngredients
    if (ingredientsToUse.length === 0) {
      setError('👩‍🍳 Please add at least one ingredient to start cooking!')
      return
    }

    setLoading(true)
    setCookingProgress(20)
    setCookingStepText(
      rescueMode
        ? '🚨 Rescue Mode Active: Prioritizing ingredients nearing expiration...'
        : 'Inspecting your fridge inventory & dietary requirements...'
    )

    const progressTimer1 = setTimeout(() => {
      setCookingProgress(50)
      setCookingStepText(
        `Consulting culinary principles with ${modelMode === 'gemma' ? 'Gemma 4' : 'Turbo Flash'}...`
      )
    }, 1200)

    const progressTimer2 = setTimeout(() => {
      setCookingProgress(80)
      setCookingStepText('Balancing flavors, measurement ratios & zero-waste pantry staples...')
    }, 3800)

    const selectedModel = modelMode === 'gemma' ? 'gemma-4-26b-a4b-it' : 'gemini-3.8-flash'

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredientsToUse,
          dietary,
          cooking_time: cookingTime,
          servings,
          prioritize_soon: prioritize,
          model_override: selectedModel,
          allow_fallback: autoFallback,
          cuisine,
          difficulty,
          allergies,
          rescue_mode: rescueMode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Could not generate recipes at this time.')
      }

      setCookingProgress(100)
      setCookingStepText('Plating your dishes! Bon appétit!')

      setTimeout(() => {
        setRecipesData(data)
      }, 400)
    } catch (err) {
      console.error('Recipe generation error:', err)
      setError(err.message || "Something went wrong while communicating with Mom's Kitchen AI.")
    } finally {
      clearTimeout(progressTimer1)
      clearTimeout(progressTimer2)
      setLoading(false)
    }
  }

  // Trigger Rescue Mode from Navbar or Pantry
  const handleTriggerRescueMode = async (customList = null) => {
    setActiveTab('recipes')
    setRescueMode(true)
    setPrioritize(true)

    if (customList && customList.length > 0) {
      setIngredientsInput(customList.join(', '))
      handleCraftRecipes(customList)
    } else {
      try {
        const res = await fetch('/api/pantry/rescue')
        const items = await res.json()
        const names = items.map((i) => i.name)
        if (names.length > 0) {
          setIngredientsInput(names.join(', '))
          handleCraftRecipes(names)
        }
      } catch (err) {
        console.error('Error triggering rescue mode:', err)
      }
    }
  }

  const handleSaveRecipeToCookbook = async (recipe) => {
    try {
      const res = await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe }),
      })
      if (!res.ok) throw new Error('Could not save recipe')
    } catch (err) {
      alert(err.message)
    }
  }

  const recipes = recipesData?.recipes || []
  const metadata = recipesData?._metadata || {}

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        rescueCount={rescueCount}
        onOpenPreferences={() => setShowPreferencesModal(true)}
        onOpenImageScanner={() => setShowImageScannerModal(true)}
        onTriggerRescueMode={() => handleTriggerRescueMode()}
      />

      <div className="app-container">
        {/* Persistent Kitchen Prep Sidebar */}
        <Sidebar
          activeTab={activeTab}
          dietary={dietary}
          setDietary={setDietary}
          cookingTime={cookingTime}
          setCookingTime={setCookingTime}
          servings={servings}
          setServings={setServings}
          prioritize={prioritize}
          setPrioritize={setPrioritize}
          cuisine={cuisine}
          setCuisine={setCuisine}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          rescueMode={rescueMode}
          setRescueMode={setRescueMode}
          allergies={allergies}
          modelMode={modelMode}
          setModelMode={setModelMode}
          autoFallback={autoFallback}
          setAutoFallback={setAutoFallback}
          apiStatus={apiStatus}
          onOpenPreferences={() => setShowPreferencesModal(true)}
        />

        {/* Dynamic Main Workspace based on Active Tab */}
        <main className="main-content">
          {activeTab === 'recipes' && (
            <div>
              <Hero />

              {rescueMode && (
                <div className="alert-rescue-active">
                  <Flame size={18} />
                  <span>
                    <strong>Rescue Mode Active:</strong> Recipes are prioritized to maximize usage of
                    perishables nearing expiration.
                  </span>
                  <button
                    type="button"
                    className="btn-exit-rescue"
                    onClick={() => setRescueMode(false)}
                  >
                    Turn Off
                  </button>
                </div>
              )}

              <Inspirations onSelect={(sample) => setIngredientsInput(sample)} />

              {/* Ingredients Chalkboard Container */}
              <div className="chalkboard-card">
                <div className="chalkboard-header">
                  <div className="chalkboard-title">
                    <ChefHat size={18} className="chalkboard-icon" />
                    <span>YOUR FRIDGE INVENTORY</span>
                  </div>
                  {ingredientsInput && (
                    <button
                      type="button"
                      className="btn-clear-inventory"
                      onClick={handleClearAll}
                      title="Clear all ingredients"
                    >
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <textarea
                  className="textarea-control"
                  rows="3"
                  placeholder="e.g. leftover boiled rice, ripe tomatoes, red onion, frozen peas, cheddar cheese, stale bread"
                  value={ingredientsInput}
                  onChange={(e) => setIngredientsInput(e.target.value)}
                />

                {/* Interactive Chips Preview */}
                {parsedIngredients.length > 0 && (
                  <div className="parsed-chips-row">
                    <span className="chips-count-label">
                      Ready in pantry ({parsedIngredients.length}):
                    </span>
                    <div className="chips-wrap">
                      {parsedIngredients.map((item, idx) => (
                        <span key={idx} className="ingredient-chip-pill">
                          <span>{item}</span>
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => handleRemoveIngredient(item)}
                            title={`Remove ${item}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Row */}
              <div className="action-row">
                <button
                  type="button"
                  className={`btn-primary ${loading ? 'btn-primary-loading' : ''}`}
                  onClick={() => handleCraftRecipes()}
                  disabled={loading}
                >
                  <Sparkles size={19} className="sparkle-action-icon" />
                  <span>{loading ? 'Simmering Dishes...' : '✨ Craft Culinary Menu'}</span>
                </button>

                <div className="action-hint">
                  <span className="action-hint-pulse">🔥</span>
                  <span>
                    Gemma 4 crafts 3 recipes, checks pantry staples, and gives waste-reduction advice.
                  </span>
                </div>
              </div>

              {/* Gourmet Animated Cooking Progress Box */}
              {loading && (
                <div className="cooking-station-box">
                  <div className="cooking-station-top">
                    <div className="pot-animation-wrap">
                      <span className="steam-particle steam-1">♨️</span>
                      <span className="steam-particle steam-2">♨️</span>
                      <span className="pot-emoji">🍲</span>
                    </div>
                    <div className="cooking-station-details">
                      <h4 className="cooking-station-title">Mom's Kitchen AI is Cooking Up Ideas</h4>
                      <p className="cooking-station-step">{cookingStepText}</p>
                    </div>
                  </div>

                  <div className="cooking-progress-bar-track">
                    <div
                      className="cooking-progress-bar-fill"
                      style={{ width: `${cookingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="alert-error">
                  <div className="alert-error-header">
                    <AlertCircle size={20} />
                    <span>Culinary Generation Issue</span>
                  </div>
                  <p className="alert-error-msg">{error}</p>
                  <div className="alert-error-action">
                    <span>💡 Experiencing cloud latency with Gemma 4?</span>
                    <button
                      type="button"
                      className="btn-switch-flash"
                      onClick={() => {
                        setModelMode('flash')
                        setError('')
                      }}
                    >
                      <Zap size={13} /> Switch to Turbo Flash Mode
                    </button>
                  </div>
                </div>
              )}

              {/* Recipe Results Section */}
              {recipesData && (
                <div className="results-container">
                  <div className="results-header-banner">
                    <div>
                      <h2 className="results-title">🌱 Your Artisanal Leftover Menu</h2>
                      <p className="results-sub">
                        3 chef-crafted dishes formulated to maximize ingredient utilization and minimize food waste.
                      </p>
                    </div>

                    <div className="results-badges-wrap">
                      <span className="results-badge-pill">
                        <ChefHat size={14} /> {recipes.length} Dishes Ready
                      </span>
                      <span className="results-badge-pill">
                        <UtensilsCrossed size={14} /> {dietary}
                      </span>
                    </div>
                  </div>

                  {metadata.fallback_used && (
                    <div className="alert-info">
                      <Info size={18} className="info-icon" />
                      <span>
                        <strong>Chef's Speed Notice:</strong> Gemma 4 servers were under peak cloud demand;
                        Mom's Kitchen AI smoothly engaged high-speed mode to deliver your recipes in seconds!
                      </span>
                    </div>
                  )}

                  <div className="recipes-grid-list">
                    {recipes.map((recipe, index) => (
                      <RecipeCard
                        key={index}
                        recipe={recipe}
                        index={index + 1}
                        onStartCooking={(rec) => setActiveCookingRecipe(rec)}
                        onSaveRecipe={handleSaveRecipeToCookbook}
                        onOpenSubstitution={(ing) => setSubstitutionIngredient(ing)}
                      />
                    ))}
                  </div>

                  <SurplusSection
                    leftovers={recipesData.leftover_ingredients}
                    foodWasteTip={recipesData.food_waste_tip}
                    recipes={recipes}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'pantry' && (
            <PantryView
              onRescueToRecipes={(rescueList) => handleTriggerRescueMode(rescueList)}
              onRefreshStats={refreshPantryRescueCount}
            />
          )}

          {activeTab === 'planner' && (
            <MealPlannerView
              onNavigateToShopping={() => setActiveTab('shopping')}
              onOpenCookRecipe={(rec) => setActiveCookingRecipe(rec)}
            />
          )}

          {activeTab === 'shopping' && (
            <ShoppingListView onRefreshPantryStats={refreshPantryRescueCount} />
          )}

          {activeTab === 'cookbook' && (
            <CookbookView onOpenCookingMode={(rec) => setActiveCookingRecipe(rec)} />
          )}

          {activeTab === 'analytics' && <AnalyticsView />}

          <footer className="footer">
            🍳 <strong>Mom's Kitchen AI</strong> · Built for the Hacktoberfest Hack Day × WikiClub Tech UIT Gemma 4 Challenge<br />
            Recipe suggestions are AI-generated culinary recommendations. Always inspect food freshness and follow safe cooking temperatures.
          </footer>
        </main>
      </div>

      {/* Interactive Cooking Mode Fullscreen Modal */}
      {activeCookingRecipe && (
        <CookingModeModal
          recipe={activeCookingRecipe}
          onClose={() => setActiveCookingRecipe(null)}
          onLogCookedComplete={() => {
            refreshPantryRescueCount()
          }}
        />
      )}

      {/* Smart Ingredient Substitution Modal */}
      {substitutionIngredient && (
        <SubstitutionModal
          initialIngredient={substitutionIngredient}
          dietary={dietary}
          allergies={allergies}
          onClose={() => setSubstitutionIngredient(null)}
        />
      )}

      {/* Preferences & Allergy Safety Modal */}
      {showPreferencesModal && (
        <PreferencesModal
          onClose={() => setShowPreferencesModal(false)}
          onPreferencesUpdated={(newPrefs) => {
            if (newPrefs.dietary) setDietary(newPrefs.dietary)
            if (newPrefs.cuisine) setCuisine(newPrefs.cuisine)
            if (newPrefs.allergies) setAllergies(newPrefs.allergies)
            if (newPrefs.max_cooking_time) setCookingTime(newPrefs.max_cooking_time)
            if (newPrefs.default_servings) setServings(newPrefs.default_servings)
          }}
        />
      )}

      {/* Multimodal Pantry Image Scanner Modal */}
      {showImageScannerModal && (
        <ImageScannerModal
          onClose={() => setShowImageScannerModal(false)}
          onAddItemsToPantry={() => {
            refreshPantryRescueCount()
            setActiveTab('pantry')
          }}
          onSendToRecipeEngine={(detectedItems) => {
            setActiveTab('recipes')
            setIngredientsInput(detectedItems.join(', '))
          }}
        />
      )}
    </div>
  )
}
