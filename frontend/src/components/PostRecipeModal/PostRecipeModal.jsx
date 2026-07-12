import React, { useState, useEffect, useRef } from 'react'
import { uploadRecipe, updateRecipe, getCategories, getCuisines } from '../../api/api'
import styles from './PostRecipeModal.module.css'
import { IoClose, IoAdd, IoTrash, IoImageOutline } from 'react-icons/io5'

const emptyForm = {
  title: '',
  category: '',
  cuisine: '',
  description: '',
  ingredients: [''],
  instructions: [''],
  image: null,
}

const PostRecipeModal = ({ onClose, onSuccess, editRecipe = null }) => {
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [cuisines, setCuisines] = useState([])
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const isEdit = !!editRecipe

  useEffect(() => {
    // Prefill form if editing
    if (editRecipe) {
      setForm({
        title: editRecipe.title || '',
        category: editRecipe.category || '',
        cuisine: editRecipe.cuisine || '',
        description: editRecipe.description || '',
        ingredients: editRecipe.ingredients?.length ? editRecipe.ingredients : [''],
        instructions: editRecipe.instructions?.length ? editRecipe.instructions : [''],
        image: null,
      })
      if (editRecipe.imageUrl) setImagePreview(editRecipe.imageUrl)
    }
  }, [editRecipe])

  useEffect(() => {
    getCategories().then((cats) => setCategories(cats))
    getCuisines().then((areas) => {
      // Dedupe — TheMealDB sometimes returns duplicate strArea entries
      const unique = Array.from(new Map(areas.map((a) => [a.strArea, a])).values())
      setCuisines(unique)
    })
  }, [])

  const handleField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleListChange = (key, index, value) => {
    setForm((prev) => {
      const updated = [...prev[key]]
      updated[index] = value
      return { ...prev, [key]: updated }
    })
  }

  const addListItem = (key) => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ''] }))
  }

  const removeListItem = (key, index) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }))
  }

  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported image format. Please use JPG, PNG, or WEBP.')
      e.target.value = '' // reset input so the same invalid file can be re-selected after fixing
      return
    }

    setError('')
    setForm((prev) => ({ ...prev, image: file }))
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setError('')
    const cleanIngredients = form.ingredients.filter((i) => i.trim())
    const cleanInstructions = form.instructions.filter((i) => i.trim())

    if (!form.title.trim()) return setError('Recipe name is required.')
    if (!cleanIngredients.length) return setError('Add at least one ingredient.')
    if (!cleanInstructions.length) return setError('Add at least one instruction.')

    const fd = new FormData()
    fd.append('title', form.title.trim())
    fd.append('description', form.description.trim())
    fd.append('category', form.category)
    fd.append('cuisine', form.cuisine)
    // Send as JSON strings — backend parses them
    fd.append('ingredients', JSON.stringify(cleanIngredients))
    fd.append('instructions', JSON.stringify(cleanInstructions))
    if (form.image) fd.append('image', form.image)

    try {
      setLoading(true)
      const result = isEdit
        ? await updateRecipe(editRecipe.id, fd)
        : await uploadRecipe(fd)
      onClose()
      onSuccess?.(result, isEdit)
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // Trap focus within modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Recipe' : 'Post a Recipe'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IoClose size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {error && <p className={styles.error}>{error}</p>}

          {/* Image */}
          <div className={styles.imageUpload} onClick={() => fileRef.current.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
            ) : (
              <div className={styles.imagePlaceholder}>
                <IoImageOutline size={40} />
                <span>Click to add a photo</span>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
            />
          </div>

          {/* Title */}
          <label className={styles.label}>Recipe Name *</label>
          <input
            className={styles.input}
            placeholder="e.g. Spicy Chicken Curry"
            value={form.title}
            onChange={(e) => handleField('title', e.target.value)}
          />

          {/* Category + Cuisine */}
          <div className={styles.row}>
            <div className={styles.col}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={form.category}
                onChange={(e) => handleField('category', e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.strCategory} value={c.strCategory}>
                    {c.strCategory}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.col}>
              <label className={styles.label}>Cuisine</label>
              <select
                className={styles.select}
                value={form.cuisine}
                onChange={(e) => handleField('cuisine', e.target.value)}
              >
                <option value="">Select cuisine</option>
                {cuisines.map((c) => (
                  <option key={c.strArea} value={c.strArea}>
                    {c.strArea}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            placeholder="Short description of your recipe..."
            rows={2}
            value={form.description}
            onChange={(e) => handleField('description', e.target.value)}
          />

          {/* Ingredients */}
          <label className={styles.label}>Ingredients *</label>
          {form.ingredients.map((item, i) => (
            <div key={i} className={styles.listRow}>
              <input
                className={styles.input}
                placeholder={`Ingredient ${i + 1}`}
                value={item}
                onChange={(e) => handleListChange('ingredients', i, e.target.value)}
              />
              {form.ingredients.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => removeListItem('ingredients', i)}
                  aria-label="Remove"
                >
                  <IoTrash size={16} />
                </button>
              )}
            </div>
          ))}
          <button className={styles.addBtn} onClick={() => addListItem('ingredients')}>
            <IoAdd size={16} /> Add Ingredient
          </button>

          {/* Instructions */}
          <label className={styles.label}>Instructions *</label>
          {form.instructions.map((item, i) => (
            <div key={i} className={styles.listRow}>
              <textarea
                className={styles.textarea}
                placeholder={`Step ${i + 1}`}
                rows={2}
                value={item}
                onChange={(e) => handleListChange('instructions', i, e.target.value)}
              />
              {form.instructions.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => removeListItem('instructions', i)}
                  aria-label="Remove"
                >
                  <IoTrash size={16} />
                </button>
              )}
            </div>
          ))}
          <button className={styles.addBtn} onClick={() => addListItem('instructions')}>
            <IoAdd size={16} /> Add Step
          </button>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Post Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PostRecipeModal