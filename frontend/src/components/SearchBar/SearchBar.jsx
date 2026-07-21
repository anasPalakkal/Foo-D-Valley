import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaTimes, FaClock } from 'react-icons/fa';
import styles from './SearchBar.module.css';

const MAX_HISTORY = 5;

// localStorage read
const getSearchHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('searchHistory')) || [];
  } catch {
    return [];
  }
};

// localStorage write
const saveSearchHistory = (term) => {
  const history = getSearchHistory().filter((t) => t !== term);
  history.unshift(term);
  localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, MAX_HISTORY)));
};

// shared recent-searches list — used by both desktop mini-dropdown and mobile overlay
const HistoryList = ({ history, onPick, onDelete }) => {
  if (!history.length) return null;
  return (
    <div className={styles.historyList}>
      <p className={styles.historyLabel}>Recent Searches</p>
      {history.map((term) => (
        <div key={term} className={styles.historyItem} onClick={() => onPick(term)}>
          <FaClock className={styles.historyIcon} />
          <span>{term}</span>
          <button className={styles.historyDelete} onClick={(e) => onDelete(e, term)}>
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

// searchTerm/setSearchTerm are controlled by App — shared with Recipes page filtering
const SearchBar = ({ searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [overlayOpen, setOverlayOpen] = useState(false); // mobile full-screen overlay
  const [historyOpen, setHistoryOpen] = useState(false);  // desktop mini dropdown
  const [draft, setDraft] = useState('');                 // mobile overlay draft value
  const [history, setHistory] = useState(getSearchHistory());

  const mobileInputRef = useRef(null);
  const desktopWrapRef = useRef(null);

  // close overlays on navigation
  useEffect(() => {
    setOverlayOpen(false);
    setHistoryOpen(false);
  }, [location.pathname]);

  // close desktop dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (desktopWrapRef.current && !desktopWrapRef.current.contains(e.target)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // autofocus overlay input
  useEffect(() => {
    if (overlayOpen && mobileInputRef.current) mobileInputRef.current.focus();
  }, [overlayOpen]);

  const runSearch = (term) => {
    const clean = term.trim();
    if (!clean) return;
    saveSearchHistory(clean);
    setHistory(getSearchHistory());
    setSearchTerm(clean);
    setOverlayOpen(false);
    setHistoryOpen(false);
    navigate(`/recipes?search=${encodeURIComponent(clean)}`);
  };

  const handleDeleteHistory = (e, term) => {
    e.stopPropagation();
    const updated = getSearchHistory().filter((t) => t !== term);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setHistory(updated);
  };

  return (
    <>
      {/* desktop bar */}
      <div className={styles.desktopWrap} ref={desktopWrapRef}>
        <form
          className={styles.desktopSearch}
          onSubmit={(e) => { e.preventDefault(); runSearch(searchTerm); }}
        >
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onFocus={() => setHistoryOpen(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>

        {/* recent searches — desktop */}
        {historyOpen && (
          <div className={styles.desktopHistory}>
            <HistoryList history={history} onPick={runSearch} onDelete={handleDeleteHistory} />
          </div>
        )}
      </div>

      {/* mobile trigger icon */}
      <button className={styles.mobileSearchBtn} onClick={() => setOverlayOpen(true)}>
        <FaSearch />
      </button>

      {/* mobile overlay */}
      {overlayOpen && (
        <div className={styles.searchOverlay} onClick={() => setOverlayOpen(false)}>
          <div className={styles.searchOverlayInner} onClick={(e) => e.stopPropagation()}>
            <form
              className={styles.overlayForm}
              onSubmit={(e) => { e.preventDefault(); runSearch(draft); }}
            >
              <FaSearch className={styles.overlaySearchIcon} />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search recipes..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={styles.overlayInput}
              />
              <button type="button" className={styles.overlayClose} onClick={() => setOverlayOpen(false)}>
                <FaTimes />
              </button>
            </form>

            {/* recent searches — mobile */}
            <HistoryList history={history} onPick={runSearch} onDelete={handleDeleteHistory} />
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;