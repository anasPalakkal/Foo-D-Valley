import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaTimes, FaClock } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { getCategories } from '../../api/api.js';
import CategoryDropdown from '../CategoryDropdown/CategoryDropdown';
import styles from './Navbar.module.css';

const MAX_HISTORY = 5;
const CATEGORY_CLOSE_DELAY = 200; // ms — small buffer so the panel doesn't flicker shut mid-mouse-travel

const getSearchHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('searchHistory')) || [];
  } catch {
    return [];
  }
};

const saveSearchHistory = (term) => {
  const history = getSearchHistory().filter((t) => t !== term);
  history.unshift(term);
  localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, MAX_HISTORY)));
};

const Navbar = ({ searchTerm, setSearchTerm }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchHistory, setSearchHistory] = useState(getSearchHistory());
  const [categoryList, setCategoryList] = useState([]);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [desktopCategoriesOpen, setDesktopCategoriesOpen] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategoryList(cats.map((c) => c.strCategory)))
      .catch(() => setCategoryList([])); // non-critical — nav still works without it
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search');

    if (urlSearch !== null) {
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
      }
    } else if (location.pathname === '/recipes') {
      if (!location.search && searchTerm !== '') {
        setSearchTerm('');
      }
    }
  }, [location.search, location.pathname, searchTerm, setSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
    setSearchOpen(false);
    setMobileCategoriesOpen(false);
    setDesktopCategoriesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Clear any pending close timer on unmount so it doesn't fire against an unmounted component
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const openDesktopCategories = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setDesktopCategoriesOpen(true);
  };

  const scheduleCloseDesktopCategories = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setDesktopCategoriesOpen(false);
    }, CATEGORY_CLOSE_DELAY);
  };

  const handleDesktopSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    saveSearchHistory(searchTerm.trim());
    setSearchHistory(getSearchHistory());
    navigate(`/recipes?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleOverlaySearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    saveSearchHistory(searchInput.trim());
    setSearchHistory(getSearchHistory());
    setSearchTerm(searchInput.trim());
    setSearchOpen(false);
    navigate(`/recipes?search=${encodeURIComponent(searchInput.trim())}`);
  };

  const handleHistoryClick = (term) => {
    setSearchInput(term);
    setSearchTerm(term);
    saveSearchHistory(term);
    setSearchHistory(getSearchHistory());
    setSearchOpen(false);
    navigate(`/recipes?search=${encodeURIComponent(term)}`);
  };

  const handleDeleteHistory = (e, term) => {
    e.stopPropagation();
    const updated = getSearchHistory().filter((t) => t !== term);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className={styles.navbar}>
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={styles.logo}>
          <Link to="/">
            Foo <span className={styles.logoD}>D</span> Valley
          </Link>
        </div>

        <ul className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}>
          <li><Link to="/" className={isActive('/') ? styles.activeLink : ''}>Home</Link></li>
          <li><Link to="/recipes" className={isActive('/recipes') ? styles.activeLink : ''}>Recipes</Link></li>
          <CategoryDropdown
            categories={categoryList}
            variant="desktop"
            isOpen={desktopCategoriesOpen}
            onOpen={openDesktopCategories}
            onClose={scheduleCloseDesktopCategories}
          />
          <li><Link to="/about" className={isActive('/about') ? styles.activeLink : ''}>About</Link></li>
        </ul>

        <div className={styles.rightSection}>
          <form className={styles.desktopSearch} onSubmit={handleDesktopSearch}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>

          <button
            className={styles.mobileSearchBtn}
            onClick={() => setSearchOpen(true)}
          >
            <FaSearch />
          </button>

          {user ? (
            <div className={styles.avatarWrapper} ref={dropdownRef}>
              <button
                className={styles.avatarBtn}
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownName}>{user.name}</p>
                    <div className={styles.dropdownCounts}>
                      <span><strong>{user.followersCount ?? 0}</strong> Followers</span>
                      <span><strong>{user.followingCount ?? 0}</strong> Following</span>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link to={`/profile/${user.id}`} className={styles.dropdownItem}>Profile</Link>
                  <Link to="/settings" className={styles.dropdownItem}>Settings</Link>
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dropdownLogout} onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className={styles.btnLogin}>Login</Link>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileMenuLinks}>
            <li><Link to="/" className={isActive('/') ? styles.mobileActiveLink : ''}>Home</Link></li>
            <li><Link to="/recipes" className={isActive('/recipes') ? styles.mobileActiveLink : ''}>Recipes</Link></li>
            <CategoryDropdown
              categories={categoryList}
              variant="mobile"
              isOpen={mobileCategoriesOpen}
              onToggle={() => setMobileCategoriesOpen((prev) => !prev)}
              onSelect={() => setMenuOpen(false)}
            />
            <li><Link to="/about" className={isActive('/about') ? styles.mobileActiveLink : ''}>About</Link></li>
          </ul>
        </div>
      )}

      {searchOpen && (
        <div className={styles.searchOverlay} onClick={() => setSearchOpen(false)}>
          <div className={styles.searchOverlayInner} onClick={(e) => e.stopPropagation()}>
            <form className={styles.overlayForm} onSubmit={handleOverlaySearch}>
              <FaSearch className={styles.overlaySearchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search recipes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={styles.overlayInput}
              />
              <button
                type="button"
                className={styles.overlayClose}
                onClick={() => setSearchOpen(false)}
              >
                <FaTimes />
              </button>
            </form>

            {searchHistory.length > 0 && (
              <div className={styles.historyList}>
                <p className={styles.historyLabel}>Recent Searches</p>
                {searchHistory.map((term) => (
                  <div
                    key={term}
                    className={styles.historyItem}
                    onClick={() => handleHistoryClick(term)}
                  >
                    <FaClock className={styles.historyIcon} />
                    <span>{term}</span>
                    <button
                      className={styles.historyDelete}
                      onClick={(e) => handleDeleteHistory(e, term)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;