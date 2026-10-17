import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Leaf,
  DollarSign,
  UtensilsCrossed,
  Package,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export default function AnalyticsView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analytics')
      if (res.ok) {
        const stats = await res.json()
        setData(stats)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state-card">
          <div className="spinner" />
          <p>Calculating verified food waste & kitchen savings...</p>
        </div>
      </div>
    )
  }

  const {
    active_pantry_count = 0,
    urgent_expiry_count = 0,
    expired_count = 0,
    total_recipes_cooked = 0,
    total_servings_cooked = 0,
    total_waste_avoided_kg = 0.0,
    estimated_money_saved = 0.0,
    savings_calculation_method = '',
    recent_activity = [],
  } = data || {}

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            <BarChart3 size={24} className="inline-icon" /> Food Waste & Savings Analytics
          </h2>
          <p className="view-subtitle">
            Transparent metrics backed exclusively by your real pantry inventory and confirmed cooked meals.
          </p>
        </div>
      </div>

      {/* Methodology Notice */}
      <div className="methodology-card">
        <Info size={18} className="methodology-icon" />
        <div className="methodology-content">
          <strong>Verified Impact Philosophy:</strong> We do not assume food was saved merely because a recipe was generated. Impact statistics are calculated strictly when you complete cooking a dish in Interactive Mode or mark pantry items as consumed.
        </div>
      </div>

      {/* Key Metric Tiles */}
      <div className="analytics-metrics-grid">
        <div className="metric-tile metric-tile-green">
          <div className="metric-icon-wrap">
            <Leaf size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{total_waste_avoided_kg} kg</span>
            <span className="metric-label">Food Waste Rescued</span>
            <span className="metric-sub">~{(total_waste_avoided_kg * 2.20462).toFixed(1)} lbs of edible food</span>
          </div>
        </div>

        <div className="metric-tile metric-tile-gold">
          <div className="metric-icon-wrap">
            <DollarSign size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-value">${estimated_money_saved.toFixed(2)}</span>
            <span className="metric-label">Estimated Grocery Savings</span>
            <span className="metric-sub">$3.50 avg. savings / portion saved</span>
          </div>
        </div>

        <div className="metric-tile metric-tile-terracotta">
          <div className="metric-icon-wrap">
            <UtensilsCrossed size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{total_recipes_cooked}</span>
            <span className="metric-label">Home Recipes Cooked</span>
            <span className="metric-sub">{total_servings_cooked} delicious portions prepared</span>
          </div>
        </div>

        <div className="metric-tile metric-tile-teal">
          <div className="metric-icon-wrap">
            <Package size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{active_pantry_count}</span>
            <span className="metric-label">Active Pantry Items</span>
            <span className="metric-sub">
              {urgent_expiry_count > 0 ? `🚨 ${urgent_expiry_count} items need urgent use` : 'All items safe and fresh'}
            </span>
          </div>
        </div>
      </div>

      {/* Pantry Health Breakdown */}
      <div className="analytics-health-card">
        <h3 className="analytics-card-title">Pantry Freshness Distribution</h3>
        <div className="pantry-health-bars">
          <div className="health-bar-item">
            <div className="health-bar-label-row">
              <span>Fresh & Stable (&gt;3 days shelf life)</span>
              <strong>{Math.max(0, active_pantry_count - urgent_expiry_count - expired_count)} items</strong>
            </div>
            <div className="health-progress-track">
              <div
                className="health-progress-fill fill-fresh"
                style={{
                  width: `${active_pantry_count > 0 ? ((active_pantry_count - urgent_expiry_count - expired_count) / active_pantry_count) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="health-bar-item">
            <div className="health-bar-label-row">
              <span>Approaching Expiry (≤3 days remaining)</span>
              <strong style={{ color: '#D84A38' }}>{urgent_expiry_count} items</strong>
            </div>
            <div className="health-progress-track">
              <div
                className="health-progress-fill fill-urgent"
                style={{
                  width: `${active_pantry_count > 0 ? (urgent_expiry_count / active_pantry_count) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {expired_count > 0 && (
            <div className="health-bar-item">
              <div className="health-bar-label-row">
                <span>Past Printed Date (Check Freshness)</span>
                <strong style={{ color: '#9C2A2A' }}>{expired_count} items</strong>
              </div>
              <div className="health-progress-track">
                <div
                  className="health-progress-fill fill-expired"
                  style={{
                    width: `${active_pantry_count > 0 ? (expired_count / active_pantry_count) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Cooking Activity Log */}
      <div className="analytics-activity-card">
        <h3 className="analytics-card-title">Recent Confirmed Meals</h3>
        {recent_activity.length === 0 ? (
          <p className="no-activity-text">
            No confirmed meals logged yet. When you prepare a dish in Interactive Cooking Mode, click <strong>Mark as Cooked</strong> to log your culinary achievements here!
          </p>
        ) : (
          <div className="activity-list">
            {recent_activity.map((act) => (
              <div key={act.id} className="activity-item-row">
                <div className="activity-icon-badge">
                  <CheckCircle2 size={16} color="#2A9D8F" />
                </div>
                <div className="activity-info">
                  <span className="activity-dish-name">{act.recipe_name}</span>
                  <span className="activity-meta">
                    {act.servings} portions · Saved ~{act.waste_saved_kg} kg waste
                    {act.cooked_at && ` · ${new Date(act.cooked_at).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
