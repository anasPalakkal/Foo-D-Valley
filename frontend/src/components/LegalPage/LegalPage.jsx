import React from 'react'
import usePageTitle from '../../hooks/usePageTitle'
import styles from './LegalPage.module.css'

export const CONTACT_EMAIL = 'foodvalley.dev@gmail.com'

export const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

// blocks: string -> paragraph, array of strings -> bullet list, element -> rendered as is
export default function LegalPage({ title, updated, intro, sections }) {
  usePageTitle(title)

  return (
    <main className={styles.page}>
      <article className={styles.wrap}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated {updated}</p>
        {intro && <p className={styles.intro}>{intro}</p>}

        {sections.map(({ heading, blocks }, i) => (
          <section key={heading} className={styles.section}>
            <h2>{i + 1}. {heading}</h2>
            {blocks.map((block, j) => {
              if (typeof block === 'string') return <p key={j}>{block}</p>
              if (Array.isArray(block)) {
                return (
                  <ul key={j}>
                    {block.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )
              }
              return <React.Fragment key={j}>{block}</React.Fragment>
            })}
          </section>
        ))}
      </article>
    </main>
  )
}