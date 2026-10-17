import React from 'react'
import { ChefHat, Sparkles, Flame, Clock, Leaf } from 'lucide-react'

export default function Hero() {
  return (
    <div className="food-hero">
      {/* Decorative ambient steam & culinary sparkles */}
      <div className="hero-decorations" aria-hidden="true">
        <span className="float-item float-item-1">🌿</span>
        <span className="float-item float-item-2">✨</span>
        <span className="float-item float-item-3">🧄</span>
        <span className="float-item float-item-4">🍅</span>
        <span className="float-item float-item-5">♨️</span>
      </div>

      <div className="hero-content">
        <div className="hero-badge">
          <ChefHat size={16} className="badge-icon-spin" />
          <span>CHEF'S ZERO-WASTE KITCHEN</span>
        </div>

        <h1 className="hero-title">
          Turn Leftovers Into <span className="highlight-text">Culinary Magic</span>
        </h1>

        <p className="hero-subtitle">
          Don't waste it. Taste it. Tell Google Gemma 4 what ingredients are waiting in your fridge,
          and watch it craft three restaurant-worthy, budget-friendly recipes in seconds.
        </p>

        <div className="hero-pills">
          <div className="hero-pill">
            <Leaf size={14} className="pill-icon" />
            <span>Zero-Waste Cooking</span>
          </div>
          <div className="hero-pill">
            <Clock size={14} className="pill-icon" />
            <span>Fast & Concise Steps</span>
          </div>
          <div className="hero-pill">
            <Flame size={14} className="pill-icon" />
            <span>Smart Pantry Staples</span>
          </div>
          <div className="hero-pill hero-pill-gemma">
            <Sparkles size={14} className="pill-icon" />
            <span>Powered by Gemma 4</span>
          </div>
        </div>
      </div>
    </div>
  )
}

