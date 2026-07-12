import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryDropdown.module.css';

// variant: 'desktop' (full-width grid panel, JS-controlled open state)
//          'mobile'  (click accordion inside the existing mobile drawer)
const CategoryDropdown = ({
  categories,
  variant = 'desktop',
  isOpen,
  onOpen,
  onClose,
  onToggle,
  onSelect,
}) => {
  if (!categories || categories.length === 0) return null;

  if (variant === 'mobile') {
    return (
      <li className={styles.mobileWrapper}>
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          Categories
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▾</span>
        </button>

        {isOpen && (
          <ul className={styles.mobileList}>
            {categories.map((cat) => (
              <li key={cat}>
                <Link to={`/recipes?category=${encodeURIComponent(cat)}`} onClick={onSelect}>
                  {cat}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/recipes" className={styles.viewAll} onClick={onSelect}>
                View All Recipes
              </Link>
            </li>
          </ul>
        )}
      </li>
    );
  }

  // Desktop: JS-controlled, not CSS :hover — avoids the dead-zone gap between
  // trigger and a position:fixed panel that CSS :hover alone can't bridge.
  return (
    <li
      className={styles.desktopWrapper}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <span className={styles.desktopTrigger}>Categories</span>

      <div
        className={`${styles.desktopPanel} ${isOpen ? styles.open : ''}`}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        <div className={styles.desktopPanelInner}>
          {categories.map((cat) => (
            <Link key={cat} to={`/recipes?category=${encodeURIComponent(cat)}`}>
              {cat}
            </Link>
          ))}
        </div>
        <div className={styles.viewAllBar}>
          <Link to="/recipes" className={styles.viewAll}>
            View All Recipes →
          </Link>
        </div>
      </div>
    </li>
  );
};

export default CategoryDropdown;