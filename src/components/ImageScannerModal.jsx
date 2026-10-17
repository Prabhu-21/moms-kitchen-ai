import React, { useState, useRef } from 'react'
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Package,
} from 'lucide-react'

export default function ImageScannerModal({ onClose, onAddItemsToPantry, onSendToRecipeEngine }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [selectedIndices, setSelectedIndices] = useState({})
  const [savingToPantry, setSavingToPantry] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setScanResult(null)
    setError('')
  }

  const handleScanImage = async () => {
    if (!selectedFile) return
    setScanning(true)
    setError('')

    const formData = new FormData()
    formData.append('image', selectedFile)

    try {
      const res = await fetch('/api/scan-ingredients', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Could not analyze image.')
      }

      setScanResult(data)
      // Select all by default
      const initialMap = {}
      ;(data.detected_ingredients || []).forEach((_, idx) => {
        initialMap[idx] = true
      })
      setSelectedIndices(initialMap)
    } catch (err) {
      setError(err.message || 'Image scan failed. Please verify your internet connection.')
    } finally {
      setScanning(false)
    }
  }

  const toggleSelect = (idx) => {
    setSelectedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  const handleAddConfirmedToPantry = async () => {
    if (!scanResult?.detected_ingredients) return
    setSavingToPantry(true)

    const confirmed = scanResult.detected_ingredients.filter((_, idx) => selectedIndices[idx])

    try {
      for (const item of confirmed) {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            quantity: item.estimated_quantity,
            unit: item.unit,
            category: item.category,
            expiry_date: new Date(Date.now() + (item.estimated_freshness_days || 5) * 86400000)
              .toISOString()
              .split('T')[0],
          }),
        })
      }
      if (onAddItemsToPantry) onAddItemsToPantry()
      onClose()
    } catch (err) {
      alert('Error saving items: ' + err.message)
    } finally {
      setSavingToPantry(false)
    }
  }

  const handleSendToRecipeGenerator = () => {
    if (!scanResult?.detected_ingredients) return
    const confirmed = scanResult.detected_ingredients
      .filter((_, idx) => selectedIndices[idx])
      .map((it) => it.name)

    if (onSendToRecipeEngine) {
      onSendToRecipeEngine(confirmed)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content image-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              <Camera size={18} className="inline-icon" /> AI Pantry Image Scanner
            </h3>
            <p className="modal-subtitle">
              Snap a photo of your fridge, vegetable basket, or groceries to detect ingredients automatically.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Upload Dropzone */}
        {!scanResult && (
          <div className="scanner-dropzone-container">
            {previewUrl ? (
              <div className="scanner-preview-box">
                <img src={previewUrl} alt="Uploaded pantry" className="scanner-preview-img" />
                <button
                  type="button"
                  className="btn-reupload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Different Photo
                </button>
              </div>
            ) : (
              <div
                className="dropzone-area"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <Upload size={36} className="dropzone-icon" />
                <p className="dropzone-text">Click or drag & drop a photo of your ingredients</p>
                <span className="dropzone-sub">Supports JPG, PNG, WEBP photos</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {selectedFile && !scanning && (
              <div className="scanner-action-btn-row">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleScanImage}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Sparkles size={16} /> Scan & Detect Ingredients
                </button>
              </div>
            )}

            {scanning && (
              <div className="loading-state-card" style={{ marginTop: '1rem' }}>
                <div className="spinner" />
                <p>AI is scanning your fridge shelves and identifying produce...</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="alert-error" style={{ marginTop: '1rem' }}>
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {/* Scan Results */}
        {scanResult && (
          <div className="scanner-results-container">
            <div className="scanner-summary-bar">
              <span className="scanner-summary-text">{scanResult.image_summary}</span>
              <button
                type="button"
                className="btn-rescan-small"
                onClick={() => {
                  setScanResult(null)
                  setSelectedFile(null)
                  setPreviewUrl(null)
                }}
              >
                Scan Another
              </button>
            </div>

            <h4 className="detected-list-heading">
              Detected Ingredients (Select items to add):
            </h4>

            <div className="detected-items-list">
              {(scanResult.detected_ingredients || []).map((item, idx) => {
                const isSelected = !!selectedIndices[idx]
                return (
                  <div
                    key={idx}
                    className={`detected-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelect(idx)}
                    role="button"
                    tabIndex={0}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(idx)}
                      className="detected-checkbox"
                    />

                    <div className="detected-item-details">
                      <span className="detected-name">{item.name}</span>
                      <span className="detected-meta">
                        {item.estimated_quantity} {item.unit} · {item.category}
                      </span>
                    </div>

                    <span className={`confidence-pill confidence-${item.confidence.toLowerCase()}`}>
                      {item.confidence} confidence
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="scanner-confirm-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddConfirmedToPantry}
                disabled={savingToPantry}
              >
                <Package size={16} />
                <span>{savingToPantry ? 'Adding...' : 'Add Selected to Smart Pantry'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleSendToRecipeGenerator}
              >
                <Sparkles size={16} />
                <span>Craft Recipes Immediately</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
