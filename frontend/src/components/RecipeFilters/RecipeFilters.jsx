import React, { useState } from 'react'
import { FaChevronDown, FaSlidersH, FaTimes } from 'react-icons/fa'
import styles from './RecipeFilters.module.css'

const RecipeFilters = ({
  categories,
  cuisines,
  filters,
  onChange,
  onReset,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.cuisine !== 'all' ||
    filters.sort !== 'az'

  return (
    <>
      {/* ── Desktop filter bar ── */}
      <div className={styles.bar}>
        <div className={styles.controls}>

          {/* Sort */}
          <div className={styles.selectWrap}>
            <select
              value={filters.sort}
              onChange={(e) => onChange('sort', e.target.value)}
              className={styles.select}
            >
              <option value="az">A – Z</option>
              <option value="za">Z – A</option>
              <option value="newest">Newest (Community)</option>
            </select>
            <FaChevronDown className={styles.chevron} />
          </div>

          {/* Category */}
          <div className={styles.selectWrap}>
            <select
              value={filters.category}
              onChange={(e) => onChange('category', e.target.value)}
              className={styles.select}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <FaChevronDown className={styles.chevron} />
          </div>

          {/* Cuisine */}
          <div className={styles.selectWrap}>
            <select
              value={filters.cuisine}
              onChange={(e) => onChange('cuisine', e.target.value)}
              className={styles.select}
            >
              <option value="all">All Cuisines</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <FaChevronDown className={styles.chevron} />
          </div>

          {/* Community toggle */}
          <button
            className={`${styles.communityBtn} ${filters.source === 'community' ? styles.communityBtnActive : ''}`}
            onClick={() => onChange('source', filters.source === 'community' ? 'all' : 'community')}
          >
            Community Only
          </button>

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

        {/* Active chips */}
        <div className={styles.chips}>
          {filters.sort !== 'az' && (
            <span className={styles.chip}>
              {filters.sort === 'za' ? 'Z–A' : 'Newest'}
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
          {filters.source === 'community' && (
            <span className={styles.chip}>
              Community
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
              <div className={styles.selectWrap}>
                <select
                  value={filters.sort}
                  onChange={(e) => onChange('sort', e.target.value)}
                  className={styles.select}
                >
                  <option value="az">A – Z</option>
                  <option value="za">Z – A</option>
                  <option value="newest">Newest (Community)</option>
                </select>
                <FaChevronDown className={styles.chevron} />
              </div>
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Category</label>
              <div className={styles.selectWrap}>
                <select
                  value={filters.category}
                  onChange={(e) => onChange('category', e.target.value)}
                  className={styles.select}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <FaChevronDown className={styles.chevron} />
              </div>
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Cuisine</label>
              <div className={styles.selectWrap}>
                <select
                  value={filters.cuisine}
                  onChange={(e) => onChange('cuisine', e.target.value)}
                  className={styles.select}
                >
                  <option value="all">All Cuisines</option>
                  {cuisines.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <FaChevronDown className={styles.chevron} />
              </div>
            </div>

            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Source</label>
              <button
                className={`${styles.communityBtn} ${filters.source === 'community' ? styles.communityBtnActive : ''}`}
                onClick={() => onChange('source', filters.source === 'community' ? 'all' : 'community')}
              >
                Community Only
              </button>
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