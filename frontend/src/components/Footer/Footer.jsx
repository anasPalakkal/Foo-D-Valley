import React from 'react';
import { Link } from 'react-router-dom';
import { FaUtensils, FaHeart, FaArrowUp } from 'react-icons/fa';
import styles from './Footer.module.css';

const Footer = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Brand column */}
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            Foo<span className={styles.logoD}>D</span> Valley
          </Link>
          <p className={styles.tagline}>
            Discover recipes from every corner of the world — or share one of your own.
          </p>
          <div className={styles.madeWith}>
            <FaHeart className={styles.heartIcon} />
            <span>Powered by <a href="https://www.themealdb.com" target="_blank" rel="noreferrer">TheMealDB</a></span>
          </div>
        </div>

        {/* Nav column */}
        <div className={styles.navCol}>
          <h4 className={styles.colHeading}>Explore</h4>
          <ul className={styles.navList}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/recipes">Recipes</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </div>

        {/* Contact / info column */}
        <div className={styles.navCol}>
          <h4 className={styles.colHeading}>Get in Touch</h4>
          <ul className={styles.navList}>
            <li>
              <a href="mailto:hello@foodvalley.com">hello@foodvalley.com</a>
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
        </div>

      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Foo D Valley. All rights reserved.
        </p>
        <button className={styles.backToTop} onClick={scrollToTop} aria-label="Back to top">
          <FaArrowUp />
          <span>Back to top</span>
        </button>
      </div>
    </footer>
  );
};

export default Footer;