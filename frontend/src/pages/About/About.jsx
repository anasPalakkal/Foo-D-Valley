import React from 'react'
import { Link } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import Footer from '../../components/Footer/Footer'
import styles from './About.module.css'

// Optional values. Empty strings hide the related UI.
const CONTACT_EMAIL = 'foodvalley.dev@gmail.com'
const REPO_URL = '' // e.g. https://github.com/<user>/foo-d-valley
const DEMO = { email: 'demo@example.com', password: 'demo1234' }

const FEATURES = [
  {
    title: 'Browse a large catalog',
    text: 'Thousands of recipes from around the world, filterable by category and cuisine, alongside recipes posted by members.',
  },
  {
    title: 'Post your own',
    text: 'Add ingredients, steps and a photo. Edit or delete from your profile at any time.',
  },
  {
    title: 'Like, comment and save',
    text: 'Works on both community and TheMealDB recipes. Saved recipes are collected on one page.',
  },
  {
    title: 'Follow and message',
    text: 'Follow other cooks, message them in real time, and see activity in your notifications.',
  },
  {
    title: 'Control your account',
    text: 'Email verification, password changes, and account deletion with a 14-day recovery window.',
  },
]

const STACK = [
  ['Frontend', 'React and Vite, React Router, CSS Modules. Deployed on Vercel.'],
  ['API', 'Node.js and Express on Render, with Prisma and PostgreSQL.'],
  ['Sessions', 'A short-lived access token kept in memory and a refresh token in an httpOnly cookie.'],
  ['Realtime', 'Socket.IO for messages and notifications.'],
  ['Rate limiting', 'Sliding-window limits per endpoint, stored in Upstash Redis.'],
  ['Images', 'Uploads go to Cloudinary. TheMealDB data is cached on the server and never stored in the database.'],
]

const Section = ({ title, children }) => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>{title}</h2>
    <div className={styles.sectionBody}>{children}</div>
  </section>
)

const About = () => {
  usePageTitle('About')

  return (
    <>
      <main className={styles.page}>
        <div className={styles.wrap}>
          <header className={styles.intro}>
            <h1 className={styles.title}>Recipes from everywhere, and from the people you follow.</h1>
            <p className={styles.lede}>
              Search recipes from around the world, save the ones you like, follow other cooks,
              and post your own.
            </p>
          </header>

          {DEMO.email && (
            <Section title="Demo account">
              <p>Sign in with this shared account to try the logged-in features without registering.</p>
              <dl className={styles.creds}>
                <dt>Email</dt>
                <dd><code>{DEMO.email}</code></dd>
                <dt>Password</dt>
                <dd><code>{DEMO.password}</code></dd>
              </dl>
              <p className={styles.small}>
                Other visitors use it too. Please do not post personal information.
              </p>
              <Link to="/login" className={styles.btn}>Go to sign in</Link>
            </Section>
          )}

          <Section title="What you can do">
            <ul className={styles.list}>
              {FEATURES.map(({ title, text }) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="AI recipe assistant">
            <p>
              Signed-in members with a verified email can ask the assistant for a recipe. The number
              of requests per day is limited. You can save a generated recipe to a private list of up
              to 30; saved AI recipes never appear in the public feed.
            </p>
            <p>
              Your prompt is sent from this site&apos;s server to ElaAI, a separate recipe service by
              the same developer, which uses Google Gemini to write the recipe. Photos come from
              Pexels and are stock images, not generated. Do not include personal information in a
              prompt.
            </p>
          </Section>

          <Section title="How it's built">
            <dl className={styles.stack}>
              {STACK.map(([term, detail]) => (
                <React.Fragment key={term}>
                  <dt>{term}</dt>
                  <dd>{detail}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Section>

          <Section title="Credits">
            <p>
              Catalog data from{' '}
              <a className={styles.link} href="https://www.themealdb.com" target="_blank" rel="noopener noreferrer">
                TheMealDB
              </a>
              . AI recipe photos from{' '}
              <a className={styles.link} href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">
                Pexels
              </a>
              . Community recipes belong to the members who posted them.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, bug reports or removal requests:{' '}
              <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              {REPO_URL && (
                <>
                  {'. Source code: '}
                  <a className={styles.link} href={REPO_URL} target="_blank" rel="noopener noreferrer">
                    GitHub repository
                  </a>
                </>
              )}
              .
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default About