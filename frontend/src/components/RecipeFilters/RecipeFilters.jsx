import React, { useState } from 'react'
import { FaSlidersH, FaTimes } from 'react-icons/fa'
import CustomSelect from '../CustomSelect/CustomSelect'
import { useAuth } from '../../context/AuthContext'
import styles from './RecipeFilters.module.css'

const SORT_OPTIONS = [
  { value: 'az', label: 'A – Z' },
  { value: 'za', label: 'Z – A' },
  { value: 'newest', label: 'Newest (Community)' },
  { value: 'popular', label: 'Most Liked' },
]

const RecipeFilters = ({
  categories,
  cuisines,
  filters,
  onChange,
  onReset,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user } = useAuth()

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.cuisine !== 'all' ||
    filters.source !== 'all' ||
    filters.sort !== 'az'

  const categoryOptions = [{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c, label: c }))]
  const cuisineOptions = [{ value: 'all', label: 'All Cuisines' }, ...cuisines.map((c) => ({ value: c, label: c }))]

  // source is a single value - selecting one option clears the other
  const toggleSource = (value) => {
    onChange('source', filters.source === value ? 'all' : value)
  }

  const sourceLabel = filters.source === 'community' ? 'Community' : filters.source === 'following' ? 'Following' : null

  return (
    <>
      {/* ── Desktop filter bar ── */}
      <div className={styles.bar}>
        <div className={styles.controls}>
          <CustomSelect
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(v) => onChange('sort', v)}
          />
          <CustomSelect
            value={filters.category}
            options={categoryOptions}
            onChange={(v) => onChange('category', v)}
          />
          <CustomSelect
            value={filters.cuisine}
            options={cuisineOptions}
            onChange={(v) => onChange('cuisine', v)}
          />

          <button
            className={`${styles.communityBtn} ${filters.source === 'community' ? styles.communityBtnActive : ''}`}
            onClick={() => toggleSource('community')}
          >
            Community Only
          </button>

          {user && (
            <button
              className={`${styles.communityBtn} ${filters.source === 'following' ? styles.communityBtnActive : ''}`}
              onClick={() => toggleSource('following')}
            >
              Following
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button className={styles.resetBtn} onClick={onReset}>
            <FaTimes /> Reset
          </button>
        )}
      </div>

      {/* ── Mobile filter button ── */}
      <div className={styles.mobileBar}>
        <button
          className={`${styles.filterToggle} ${hasActiveFilters ? styles.filterToggleActive : ''}`}
          onClick={() => setDrawerOpen(true)}
        >
          <FaSlidersH />
          Filters {hasActiveFilters && <span className={styles.activeDot} />}
        </button>

        <div className={styles.chips}>
          {filters.sort !== 'az' && (
            <span className={styles.chip}>
              {filters.sort === 'za' ? 'Z–A' : filters.sort === 'popular' ? 'Most Liked' : 'Newest'}
              <button onClick={() => onChange('sort', 'az')}><FaTimes /></button>
            </span>
          )}
          {filters.category !== 'all' && (
            <span className={styles.chip}>
              {filters.category}
              <button onClick={() => onChange('category', 'all')}><FaTimes /></button>
            </span>
          )}
          {filters.cuisine !== 'all' && (
            <span className={styles.chip}>
              {filters.cuisine}
              <button onClick={() => onChange('cuisine', 'all')}><FaTimes /></button>
            </span>
          )}
          {sourceLabel && (
            <span className={styles.chip}>
              {sourceLabel}
              <button onClick={() => onChange('source', 'all')}><FaTimes /></button>
            </span>
          )}
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className={styles.overlay} onClick={() => setDrawerOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>Filters</h3>
              <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Sort</label>
              <CustomSelect value={filters.sort} options={SORT_OPTIONS} onChange={(v) => onChange('sort', v)} />
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Category</label>
              <CustomSelect value={filters.category} options={categoryOptions} onChange={(v) => onChange('category', v)} />
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Cuisine</label>
              <CustomSelect value={filters.cuisine} options={cuisineOptions} onChange={(v) => onChange('cuisine', v)} />
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Source</label>
              <div className={styles.controls}>
                <button
                  className={`${styles.communityBtn} ${filters.source === 'community' ? styles.communityBtnActive : ''}`}
                  onClick={() => toggleSource('community')}
                >
                  Community Only
                </button>
                {user && (
                  <button
                    className={`${styles.communityBtn} ${filters.source === 'following' ? styles.communityBtnActive : ''}`}
                    onClick={() => toggleSource('following')}
                  >
                    Following
                  </button>
                )}
              </div>
            </div>

            <div className={styles.drawerFooter}>
              {hasActiveFilters && (
                <button className={styles.resetBtn} onClick={() => { onReset(); setDrawerOpen(false) }}>
                  Reset all
                </button>
              )}
              <button className={styles.applyBtn} onClick={() => setDrawerOpen(false)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RecipeFilters