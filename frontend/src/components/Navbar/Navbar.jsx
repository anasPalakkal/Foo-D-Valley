import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { IoAlertCircleOutline, IoPersonOutline, IoBookmarkOutline, IoSettingsOutline, IoLogOutOutline } from 'react-icons/io5';
import { resendVerification, getCategories } from '../../api/api.js';
import Logo from '../Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import CategoryDropdown from '../CategoryDropdown/CategoryDropdown';
import SearchBar from '../SearchBar/SearchBar';
import styles from './Navbar.module.css';

const CATEGORY_CLOSE_DELAY = 200; // hover exit buffer

const Navbar = ({ searchTerm, setSearchTerm }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoryList, setCategoryList] = useState([]);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [desktopCategoriesOpen, setDesktopCategoriesOpen] = useState(false);

  const dropdownRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // category list — non-critical
  useEffect(() => {
    getCategories()
      .then((cats) => setCategoryList(cats.map((c) => c.strCategory)))
      .catch(() => setCategoryList([]));
  }, []);

  // sync searchTerm FROM the url only — never the reverse.
  // (searchTerm was previously a dependency here, which caused every
  // keystroke to re-trigger this effect and snap the input back to
  // whatever was already in the url — see commit fixing search bug)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search');

    if (urlSearch !== null) {
      setSearchTerm(urlSearch);
    } else if (location.pathname === '/recipes') {
      setSearchTerm('');
    }
  }, [location.search, location.pathname, setSearchTerm]);

  // account dropdown outside-click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // close everything on route change
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
    setMobileCategoriesOpen(false);
    setDesktopCategoriesOpen(false);
  }, [location.pathname]);

  // clear pending hover-close timer on unmount
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

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const [resendState, setResendState] = useState('idle'); // idle | sending | sent

  const handleResendVerification = async () => {
    setResendState('sending');
    try {
      await resendVerification();
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  };

  return (
    <>
      <nav className={styles.navbar}>
        {/* mobile menu toggle */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* brand logo */}
        <div className={styles.logo}>
          <Link to="/" aria-label="Foo D Valley home">
            <Logo variant="light" className={styles.logoSvg} />
          </Link>
        </div>

        {/* desktop nav links */}
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
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          {/* account menu */}
          {loading ? (
            // Session restore in flight — render a neutral placeholder instead of
            // guessing guest/logged-in. Prevents the login-button-then-avatar flash.
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarFallback} style={{ opacity: 0.35 }} />
            </div>
          ) : user ? (
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
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className={styles.dropdownAvatar} />
                    ) : (
                      <div className={styles.dropdownAvatarFallback}>
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={styles.dropdownHeaderText}>
                      <p className={styles.dropdownName}>{user.name}</p>
                      <div className={styles.dropdownCounts}>
                        <span><strong>{user.followersCount ?? 0}</strong> Followers</span>
                        <span><strong>{user.followingCount ?? 0}</strong> Following</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.dropdownDivider} />

                  <div className={styles.dropdownBody}>
                    <Link to={`/profile/${user.id}`} className={styles.dropdownItem}>
                      <IoPersonOutline /> Profile
                    </Link>
                    <Link to="/saved" className={styles.dropdownItem}>
                      <IoBookmarkOutline /> Saved Recipes
                    </Link>
                    <Link to="/settings" className={styles.dropdownItem}>
                      <IoSettingsOutline /> Settings
                    </Link>
                  </div>

                  <div className={styles.dropdownDivider} />

                  <div className={styles.dropdownBody}>
                    <button className={styles.dropdownLogout} onClick={handleLogout}>
                      <IoLogOutOutline /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className={styles.btnLogin}>Login</Link>
          )}
        </div>
      </nav>

      {user && !user.isVerified && (
        <div className={styles.verifyBanner}>
          <IoAlertCircleOutline className={styles.verifyBannerIcon} />
          <span className={styles.verifyBannerText}>
            Verify your email to unlock all features.
          </span>
          <button
            className={styles.verifyBannerBtn}
            onClick={handleResendVerification}
            disabled={resendState === 'sending'}
          >
            {resendState === 'sending' ? 'Sending...' : resendState === 'sent' ? 'Sent' : 'Resend email'}
          </button>
        </div>
      )
      }
      {/* mobile drawer */}
      {
        menuOpen && (
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
        )
      }
    </>
  );
};

export default Navbar;