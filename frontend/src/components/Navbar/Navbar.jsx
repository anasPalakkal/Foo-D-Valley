import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaTimes, FaClock } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

const MAX_HISTORY = 5;

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

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync URL search parameter to global state (handles deep-linking & hero search redirection)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search');

    if (urlSearch !== null) {
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
      }
    } else if (location.pathname === '/recipes') {
      // Clear input when navigating directly to /recipes cleanly via navbar links
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
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

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
        {/* Hamburger — mobile only */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Logo */}
        <div className={styles.logo}>
          <Link to="/">
            Foo <span className={styles.logoD}>D</span> Valley
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <ul className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}>
          <li><Link to="/" className={isActive('/') ? styles.activeLink : ''}>Home</Link></li>
          <li><Link to="/recipes" className={isActive('/recipes') ? styles.activeLink : ''}>Recipes</Link></li>
          <li><Link to="/saved" className={isActive('/saved') ? styles.activeLink : ''}>Favorites</Link></li>
          <li><Link to="/about" className={isActive('/about') ? styles.activeLink : ''}>About</Link></li>
        </ul>

        {/* Right Section */}
        <div className={styles.rightSection}>
          {/* Desktop Search */}
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

          {/* Mobile Search Icon */}
          <button
            className={styles.mobileSearchBtn}
            onClick={() => setSearchOpen(true)}
          >
            <FaSearch />
          </button>

          {/* Auth */}
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

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileMenuLinks}>
            <li><Link to="/" className={isActive('/') ? styles.mobileActiveLink : ''}>Home</Link></li>
            <li><Link to="/recipes" className={isActive('/recipes') ? styles.mobileActiveLink : ''}>Recipes</Link></li>
            <li><Link to="/saved" className={isActive('/saved') ? styles.mobileActiveLink : ''}>Favorites</Link></li>
            <li><Link to="/about" className={isActive('/about') ? styles.mobileActiveLink : ''}>About</Link></li>
          </ul>
        </div>
      )}

      {/* Search Overlay */}
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