import React, { useState, useRef, useEffect } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import styles from './CustomSelect.module.css'

/**
 * Fully custom dropdown — replaces native <select> to avoid
 * OS-rendered option lists that can't be styled with CSS.
 *
 * options: [{ value: string, label: string }] or string[]
 */
const CustomSelect = ({ value, options, onChange, placeholder = 'Select', fullWidth = false }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Normalize options to { value, label }
  const normalized = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  const selected = normalized.find((opt) => opt.value === value)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSelect = (optValue) => {
    onChange(optValue)
    setOpen(false)
  }

  return (
    <div className={`${styles.wrap} ${fullWidth ? styles.fullWidth : ''}`} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerLabel}>{selected?.label || placeholder}</span>
        <FaChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <ul className={styles.menu} role="listbox">
          {normalized.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`${styles.option} ${opt.value === value ? styles.optionActive : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CustomSelect