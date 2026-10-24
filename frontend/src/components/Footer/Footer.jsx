import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaUtensils, FaHeart, FaArrowUp } from 'react-icons/fa';
import styles from './Footer.module.css';
import Logo from '../Logo/Logo';

const Footer = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Native <details> hides its content on close in a way that isn't always
  // reliably overridable by the desktop `display: flex !important` CSS rule
  // across browsers. So on desktop we force `open` via JS instead, while
  // leaving mobile alone (closed by default, toggled by the user's tap).
  const exploreRef = useRef(null);
  const contactRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 769px)');

    const syncOpenState = (e) => {
      const isDesktop = e.matches;
      if (isDesktop) {
        if (exploreRef.current) exploreRef.current.open = true;
        if (contactRef.current) contactRef.current.open = true;
      }
    };

    syncOpenState(mediaQuery);
    mediaQuery.addEventListener('change', syncOpenState);
    return () => mediaQuery.removeEventListener('change', syncOpenState);
  }, []);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Brand column */}
        <div className={styles.brand}>
          <Link to="/" className={styles.logo} aria-label="Foo D Valley home">
            <Logo variant="brand" className={styles.logoSvg} />
          </Link>
          <p className={styles.tagline}>
            Discover recipes from every corner of the world — or share one of your own.
          </p>
          <div className={styles.madeWith}>
            <FaHeart className={styles.heartIcon} />
            <span>Powered by <a href="https://www.themealdb.com" target="_blank" rel="noreferrer">TheMealDB</a></span>
          </div>
        </div>

        {/* Nav column - accordion on mobile, static/expanded on desktop (forced open via CSS) */}
        <details className={styles.navCol} ref={exploreRef}>
          <summary className={styles.colHeading}>Explore</summary>
          <ul className={styles.navList}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/recipes">Recipes</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </details>

        {/* Contact / info column */}
        <details className={styles.navCol} ref={contactRef}>
          <summary className={styles.colHeading}>Get in Touch</summary>
          <ul className={styles.navList}>
            <li>
              <a href="mailto:foodvalley.dev@gmail.com">foodvalley.dev@gmail.com</a>
            </li>
            <li>
              <a href="https://www.themealdb.com" target="_blank" rel="noreferrer">
                Recipe data: TheMealDB
              </a>
            </li>
          </ul>
          <div className={styles.attribution}>
            <FaUtensils className={styles.utensilIcon} />
            <span>Community recipes uploaded by our users</span>
          </div>
        </details>

      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <div className={styles.legalRow}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Foo D Valley. All rights reserved.
          </p>
          {/* TODO: point these at real routes once the pages exist. Do not remove -
              a public app collecting accounts and user uploads needs these before launch. */}
          <div className={styles.legalLinks}>
            <Link to="/privacy">Privacy Policy</Link>
            <span className={styles.legalDivider} aria-hidden="true">•</span>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
        <button className={styles.backToTop} onClick={scrollToTop} aria-label="Back to top">
          <FaArrowUp />
          <span className={styles.backToTopLabel}>Back to top</span>
        </button>
      </div>
    </footer>
  );
};

export default Footer;