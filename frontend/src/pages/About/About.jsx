import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaGlobeAmericas,
  FaPencilAlt,
  FaHeart,
  FaUserFriends,
  FaShieldAlt,
  FaBookmark,
} from 'react-icons/fa';
import styles from './About.module.css';
import Footer from '../../components/Footer/Footer';

const FEATURES = [
  {
    icon: FaGlobeAmericas,
    title: 'A global recipe catalog',
    text: "Thousands of dishes pulled in from TheMealDB, browsable by category and cuisine.",
  },
  {
    icon: FaPencilAlt,
    title: 'Post your own recipes',
    text: 'Add title, ingredients, steps, and a photo. Edit or delete anytime from your profile.',
  },
  {
    icon: FaHeart,
    title: 'Like and comment',
    text: 'React to recipes and leave comments, on both community and TheMealDB recipes.',
  },
  {
    icon: FaBookmark,
    title: 'Save your favorites',
    text: 'Bookmark any recipe, internal or external, and find it again in Saved Recipes.',
  },
  {
    icon: FaUserFriends,
    title: 'Follow other cooks',
    text: 'Follow users you like and get their new recipes in your feed first.',
  },
  {
    icon: FaShieldAlt,
    title: 'Accounts you can trust',
    text: 'Email verification, secure sessions, and a 14-day recovery window if you delete your account.',
  },
];

const About = () => {
  return (
    <>
      <div className={styles.page}>

        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Foo<span className={styles.logoD}>D</span> Valley
          </h1>
          <p className={styles.heroSub}>
            A place to find recipes from around the world, and to share your own.
          </p>
        </section>

        {/* Intro */}
        <section className={styles.intro}>
          <p>
            Foo D Valley combines a large existing recipe database with recipes posted
            by the community. Search, filter, save what you like, and post your own
            when you're ready.
          </p>
        </section>

        {/* Features */}
        <section className={styles.features}>
          <h2 className={styles.sectionHeading}>What you can do here</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div className={styles.featureItem} key={title}>
                <Icon className={styles.featureIcon} />
                <div>
                  <h3 className={styles.featureTitle}>{title}</h3>
                  <p className={styles.featureText}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data attribution */}
        <section className={styles.dataNote}>
          <p>
            Recipe data for the global catalog is provided by{' '}
            <a href="https://www.themealdb.com" target="_blank" rel="noopener noreferrer">
              TheMealDB
            </a>
            . Community recipes are uploaded directly by Foo D Valley users.
          </p>
        </section>

        {/* Developer */}
        <section className={styles.developer}>
          <div className={styles.devAvatar}>M</div>
          <div className={styles.devInfo}>
            <h3 className={styles.devName}>Mohammed Anas</h3>
            <p className={styles.devRole}>Developer</p>
            <a href="mailto:mohammedanasp1234@gmail.com" className={styles.devEmail}>
              mohammedanasp1234@gmail.com
            </a>
            <div className={styles.socialLinks}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <FaGithub className={styles.icon} />
              </a>
              <a href="https://www.linkedin.com/in/anaspalakkal" target="_blank" rel="noopener noreferrer">
                <FaLinkedin className={styles.icon} />
              </a>
              <a href="https://instagram.com/anas.food.dev" target="_blank" rel="noopener noreferrer">
                <FaInstagram className={styles.icon} />
              </a>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
};

export default About;