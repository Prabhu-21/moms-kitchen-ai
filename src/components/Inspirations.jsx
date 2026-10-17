import React from 'react'
import { Sparkles, UtensilsCrossed } from 'lucide-react'

const SAMPLES = [
  {
    icon: '🍚',
    tag: 'Quick Stir-Fry',
    name: 'Leftover Rice Fiesta',
    ingredients: 'leftover cooked rice, bell pepper, carrots, onion, soy sauce, peas',
    preview: ['Cooked Rice', 'Peas', 'Carrots', 'Soy Sauce'],
  },
  {
    icon: '🥖',
    tag: 'Rustic Italian',
    name: 'Artisan Bruschetta Melt',
    ingredients: 'stale bread, ripe tomatoes, garlic, cheese, olive oil, basil',
    preview: ['Stale Bread', 'Tomatoes', 'Garlic', 'Cheese'],
  },
  {
    icon: '🥔',
    tag: 'Comfort Curry',
    name: 'Cozy Spiced Aloo Saute',
    ingredients: 'boiled potatoes, tomatoes, onion, green chili, ginger, cumin',
    preview: ['Potatoes', 'Tomatoes', 'Onion', 'Spices'],
  },
  {
    icon: '🍝',
    tag: 'Midnight Bistro',
    name: 'Midnight Aglio e Olio',
    ingredients: 'leftover pasta, garlic, olive oil, chili flakes, cheese, parsley',
    preview: ['Pasta', 'Garlic', 'Chili Flakes', 'Olive Oil'],
  },
]

export default function Inspirations({ onSelect }) {
  return (
    <div className="inspirations-section">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">
            <UtensilsCrossed size={20} className="inline-icon" /> What’s in your kitchen today?
          </h3>
          <p className="section-sub">
            Tap a chef-curated inspiration or type whatever ingredients you have on hand:
          </p>
        </div>
      </div>

      <div className="inspirations-grid">
        {SAMPLES.map((sample) => (
          <button
            key={sample.name}
            type="button"
            className="inspiration-card"
            onClick={() => onSelect(sample.ingredients)}
            title={`Load ${sample.name} into kitchen station`}
          >
            <div className="inspiration-card-header">
              <span className="inspiration-emoji">{sample.icon}</span>
              <span className="inspiration-tag">{sample.tag}</span>
            </div>
            <div className="inspiration-card-body">
              <h4 className="inspiration-title">{sample.name}</h4>
              <div className="inspiration-chips">
                {sample.preview.map((p, idx) => (
                  <span key={idx} className="preview-chip">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="inspiration-card-footer">
              <Sparkles size={13} />
              <span>Use this pantry set</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

