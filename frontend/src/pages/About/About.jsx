import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';
import styles from './About.module.css';

const About = () => {
  return (
    <>
      <div className={styles['about-container']}>
        <h1>About <span className={styles.highlight}>Foo <span className={styles['logo-d']}>D</span> Valley</span></h1>

        <p className={styles['intro-text']}>
          Welcome to <strong>Foo D Valley</strong> — your digital kitchen companion!
        </p>

        <section className={styles['about-section']}>
          <h2>🌟 Our Mission</h2>
          <p>To make cooking fun, easy, and accessible for everyone.</p>
        </section>

        <section className={styles['about-section']}>
          <h2>🍽 What You'll Find</h2>
          <ul>
            <li>✔ Delicious international & local recipes</li>
            <li>✔ Step-by-step instructions for all skill levels</li>
            <li>✔ Time-saving tips & smart kitchen hacks</li>
            <li>✔ Beautiful, easy-to-use interface</li>
            <li>✔ Ability to save and revisit your favorite dishes</li>
          </ul>
        </section>

        <section className={styles['about-section']}>
          <h2>🤝 Join the Community</h2>
          <p>Try new recipes, share your creations, and become part of a growing foodie family.</p>
        </section>

        <section className={styles['about-section']}>
          <h2>👨‍💻 Meet the Developer</h2>
          <p>Designed and developed by <strong>Mohammed Anas</strong>.</p>
          <p><strong>Email:</strong> <a href="mailto:mohammedanasp1234@gmail.com">mohammedanasp1234@gmail.com</a></p>
          <div className={styles['social-links']}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <FaGithub className={styles.icon} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/anaspalakkal" target="_blank" rel="noopener noreferrer">
              <FaLinkedin className={styles.icon} /> LinkedIn
            </a>
            <a href="https://instagram.com/anas.food.dev" target="_blank" rel="noopener noreferrer">
              <FaInstagram className={styles.icon} /> Instagram
            </a>
          </div>
        </section>
      </div>

      <footer className={styles['site-footer']}>
        <div className={styles['footer-content']}>
          <div className={styles['footer-logo-text']}>
            <a href="/" className={styles['footer-logo-link']}>
              Foo<span className={styles['logo-d']}>D</span> Valley
            </a>
          </div>
          <div className={styles['footer-links']}>
            <a href="/">Home</a>
            <a href="/recipes">Recipes</a>
            <a href="/saved">Favorites</a>
            <a href="/about">About</a>
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#b0413e' }}>
            © 2025 Foo D Valley. All rights reserved.
          </p>
          <button className={styles['back-to-top']} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to Top
          </button>
        </div>
      </footer>
    </>
  );
};

export default About;