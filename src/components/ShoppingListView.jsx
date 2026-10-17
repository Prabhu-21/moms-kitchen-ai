import React, { useState, useEffect } from 'react'
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowRight,
  PackageCheck,
  Check,
  X,
} from 'lucide-react'

export default function ShoppingListView({ onRefreshPantryStats }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemUnit, setNewItemUnit] = useState('pcs')
  const [newItemCat, setNewItemCat] = useState('Produce')
  const [showAddForm, setShowAddForm] = useState(false)
  const [transferStatus, setTransferStatus] = useState('')

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shopping-list')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (err) {
      console.error('Error fetching shopping list:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleTogglePurchased = async (id, currentVal) => {
    try {
      const res = await fetch(`/api/shopping-list/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_purchased: !currentVal }),
      })
      if (res.ok) fetchItems()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          quantity: newItemQty,
          unit: newItemUnit,
          category: newItemCat,
          source: 'manual',
        }),
      })
      if (res.ok) {
        setNewItemName('')
        setShowAddForm(false)
        fetchItems()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`/api/shopping-list/${id}`, { method: 'DELETE' })
      if (res.ok) fetchItems()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleClearCompleted = async () => {
    try {
      const res = await fetch('/api/shopping-list/clear-purchased', { method: 'POST' })
      if (res.ok) fetchItems()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleTransferToPantry = async () => {
    setTransferStatus('Transferring purchased items to smart pantry...')
    try {
      const res = await fetch('/api/shopping-list/transfer-to-pantry', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTransferStatus(`Transferred ${data.transferred_count} purchased groceries to your active pantry!`)
        fetchItems()
        if (onRefreshPantryStats) onRefreshPantryStats()
        setTimeout(() => setTransferStatus(''), 4000)
      }
    } catch (err) {
      alert('Failed to transfer to pantry: ' + err.message)
      setTransferStatus('')
    }
  }

  const pendingItems = items.filter((i) => !i.is_purchased)
  const purchasedItems = items.filter((i) => i.is_purchased)

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            <ShoppingCart size={24} className="inline-icon" /> Smart Shopping List
          </h2>
          <p className="view-subtitle">
            Consolidated groceries with active pantry subtractions. Check off items while shopping and transfer them directly into your pantry.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={16} /> Add Grocery Item
          </button>
          {purchasedItems.length > 0 && (
            <button
              type="button"
              className="btn-transfer-pantry"
              onClick={handleTransferToPantry}
              title="Move checked-off groceries into active pantry"
            >
              <PackageCheck size={16} />
              <span>Add to Pantry ({purchasedItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {transferStatus && (
        <div className="alert-info" style={{ animation: 'slideUpFade 0.2s' }}>
          <CheckCircle2 size={18} color="#2A9D8F" />
          <span>{transferStatus}</span>
        </div>
      )}

      {/* Manual Add Inline Box */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="shopping-add-box">
          <input
            type="text"
            required
            placeholder="Ingredient name (e.g. olive oil, eggs, garlic)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="input-control"
            style={{ flex: 2 }}
            autoFocus
          />
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={newItemQty}
            onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
            className="input-control"
            style={{ width: '80px' }}
          />
          <input
            type="text"
            placeholder="unit"
            value={newItemUnit}
            onChange={(e) => setNewItemUnit(e.target.value)}
            className="input-control"
            style={{ width: '80px' }}
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
            <X size={16} />
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading-state-card">
          <div className="spinner" />
          <p>Loading your shopping list...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state-card">
          <span className="empty-state-icon">🛒</span>
          <h3 className="empty-state-title">Your shopping list is clear!</h3>
          <p className="empty-state-sub">
            Add missing groceries manually or click <strong>Generate Shopping List</strong> in the Meal Planner to automatically calculate missing pantry ingredients.
          </p>
        </div>
      ) : (
        <div className="shopping-sections-wrap">
          {/* Pending Groceries */}
          <div className="shopping-group">
            <h4 className="shopping-group-title">
              To Buy ({pendingItems.length})
            </h4>

            {pendingItems.length === 0 ? (
              <p className="empty-group-text">All items in your list have been purchased! 🎉</p>
            ) : (
              <div className="shopping-list-items">
                {pendingItems.map((item) => (
                  <div key={item.id} className="shopping-item-row">
                    <button
                      type="button"
                      className="shopping-checkbox-btn"
                      onClick={() => handleTogglePurchased(item.id, item.is_purchased)}
                      title="Mark as purchased"
                    >
                      <Circle size={20} className="shopping-check-icon unchecked" />
                    </button>

                    <div className="shopping-item-details">
                      <span className="shopping-item-name">{item.name}</span>
                      <span className="shopping-item-meta">
                        {item.quantity} {item.unit} · {item.category}
                        {item.source === 'planner' && (
                          <span className="shopping-source-badge">From Planner</span>
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="shopping-delete-btn"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purchased Groceries */}
          {purchasedItems.length > 0 && (
            <div className="shopping-group">
              <div className="shopping-group-header">
                <h4 className="shopping-group-title">
                  Purchased ({purchasedItems.length})
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-transfer-pantry-small"
                    onClick={handleTransferToPantry}
                    title="Move to active pantry"
                  >
                    <PackageCheck size={14} /> Add All to Pantry
                  </button>
                  <button
                    type="button"
                    className="btn-clear-completed"
                    onClick={handleClearCompleted}
                  >
                    Clear Purchased
                  </button>
                </div>
              </div>

              <div className="shopping-list-items">
                {purchasedItems.map((item) => (
                  <div key={item.id} className="shopping-item-row shopping-item-purchased">
                    <button
                      type="button"
                      className="shopping-checkbox-btn"
                      onClick={() => handleTogglePurchased(item.id, item.is_purchased)}
                      title="Unmark purchased"
                    >
                      <CheckCircle2 size={20} className="shopping-check-icon checked" />
                    </button>

                    <div className="shopping-item-details">
                      <span className="shopping-item-name">{item.name}</span>
                      <span className="shopping-item-meta">
                        {item.quantity} {item.unit} · Ready for pantry
                      </span>
                    </div>

                    <button
                      type="button"
                      className="shopping-delete-btn"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
