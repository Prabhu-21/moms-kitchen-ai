import React from 'react'
import { Package, Globe, Download, Sparkles, BookOpen } from 'lucide-react'

export default function SurplusSection({ leftovers = [], foodWasteTip = '', recipes = [] }) {
  const handleDownload = () => {
    if (!recipes || recipes.length === 0) return

    const lines = [
      '====================================================',
      '       🥘 MOM’S KITCHEN AI — HOME MENU 🥘           ',
      '        "Don\'t Waste It. Taste It."                ',
      '       Powered by Google Gemma 4 (Gemini API)       ',
      '====================================================\n',
    ]

    recipes.forEach((recipe, i) => {
      lines.push(`DISH #${i + 1}: ${recipe.name || 'Recipe'}`)
      if (recipe.description) lines.push(`"${recipe.description}"`)
      lines.push(
        `⏱️ Time: ${recipe.time_minutes || '—'} minutes | Difficulty: ${recipe.difficulty || 'Easy'}`
      )
      lines.push(`🥗 Ingredients Used: ${(recipe.ingredients_used || []).join(', ')}`)
      lines.push(`🧂 Pantry Staples: ${(recipe.missing_ingredients || []).join(', ')}`)
      lines.push('👨‍🍳 Cooking Method:')
      ;(recipe.steps || []).forEach((step, sIdx) => {
        lines.push(`   ${sIdx + 1}. ${step}`)
      })
      if (recipe.waste_reduction_tip) {
        lines.push(`🌱 Waste-Saving Tip: ${recipe.waste_reduction_tip}`)
      }
      lines.push('\n----------------------------------------------------\n')
    })

    if (foodWasteTip) {
      lines.push(`CHEF'S ZERO-WASTE WISDOM:\n${foodWasteTip}\n`)
    }

    lines.push('Generated with Mom\'s Kitchen AI — Eat well & waste less!')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'moms-kitchen-recipes.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="surplus-section">
      <div className="surplus-grid">
        {leftovers && leftovers.length > 0 && (
          <div className="surplus-box surplus-larder">
            <div className="surplus-box-title">
              <Package size={18} className="box-icon" /> STILL IN YOUR LARDER
            </div>
            <p className="surplus-box-sub">
              These remaining ingredients are saved for another delicious meal:
            </p>
            <div className="larder-tags-wrap">
              {leftovers.map((item, idx) => (
                <span key={idx} className="larder-tag">
                  <span className="tag-emoji">📦</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {foodWasteTip && (
          <div className="surplus-box surplus-wisdom">
            <div className="surplus-box-title wisdom-title">
              <Globe size={18} className="box-icon" /> CHEF'S ZERO-WASTE WISDOM
            </div>
            <p className="wisdom-text">"{foodWasteTip}"</p>
            <div className="wisdom-footer">
              <Sparkles size={14} />
              <span>Sustainability Tip by Mom's Kitchen AI</span>
            </div>
          </div>
        )}
      </div>

      <div className="download-row">
        <button
          type="button"
          onClick={handleDownload}
          className="btn-download-menu"
        >
          <BookOpen size={18} className="btn-icon" />
          <span>Save & Download Chef's Menu (.TXT)</span>
          <Download size={16} />
        </button>
      </div>
    </div>
  )
}

