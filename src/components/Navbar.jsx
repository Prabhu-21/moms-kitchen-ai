import React from 'react'
import {
  Utensils,
  Package,
  Calendar,
  ShoppingCart,
  Bookmark,
  BarChart3,
  SlidersHorizontal,
  Flame,
  Camera,
} from 'lucide-react'

export default function Navbar({
  activeTab,
  setActiveTab,
  rescueCount = 0,
  onOpenPreferences,
  onOpenImageScanner,
  onTriggerRescueMode,
}) {
  const tabs = [
    { id: 'recipes', label: 'Recipes', icon: Utensils },
    { id: 'pantry', label: 'Smart Pantry', icon: Package, badge: rescueCount > 0 ? rescueCount : null },
    { id: 'planner', label: 'Meal Planner', icon: Calendar },
    { id: 'shopping', label: 'Shopping List', icon: ShoppingCart },
    { id: 'cookbook', label: 'Cookbook', icon: Bookmark },
    { id: 'analytics', label: 'Waste & Impact', icon: BarChart3 },
  ]

  return (
    <header className="top-navbar">
      <div className="navbar-brand" onClick={() => setActiveTab('recipes')} role="button" tabIndex={0}>
        <div className="brand-logo-container">
          <span className="brand-logo-emoji">🥘</span>
        </div>
        <div className="brand-text-col">
          <div className="brand-title-wrap">
            <span className="brand-title">Mom's Kitchen AI</span>
            <span className="brand-badge-homemade">Homemade</span>
          </div>
          <span className="brand-tagline">Zero-Waste Culinary Assistant</span>
        </div>
      </div>

      <nav className="navbar-tabs" aria-label="Kitchen navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} className="nav-tab-icon" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="nav-tab-badge" title={`${tab.badge} items need urgent rescue!`}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="navbar-actions">
        {rescueCount > 0 && (
          <button
            type="button"
            className="btn-rescue-quick"
            onClick={onTriggerRescueMode}
            title="Rescue expiring ingredients immediately!"
          >
            <Flame size={15} />
            <span>Rescue ({rescueCount})</span>
          </button>
        )}

        <button
          type="button"
          className="btn-nav-action"
          onClick={onOpenImageScanner}
          title="Scan pantry from a photo"
        >
          <Camera size={16} />
          <span className="btn-label-desktop">Scan Photo</span>
        </button>

        <button
          type="button"
          className="btn-nav-action"
          onClick={onOpenPreferences}
          title="Kitchen preferences & allergy safety"
        >
          <SlidersHorizontal size={16} />
          <span className="btn-label-desktop">Preferences</span>
        </button>
      </div>
    </header>
  )
}
