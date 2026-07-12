import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';
import styles from './About.module.css';
import Footer from '../../components/Footer/Footer';

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
      <Footer/>
    </>
  );
};

export default About;