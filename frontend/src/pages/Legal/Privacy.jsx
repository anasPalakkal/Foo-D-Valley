import React from 'react'
import { Link } from 'react-router-dom'
import LegalPage, { Mail } from '../../components/LegalPage/LegalPage'

const SECTIONS = [
  {
    heading: 'Who we are',
    blocks: [
      <p>
        Foo D Valley is operated by an individual developer based in Malappuram, Kerala, India.
        For this policy, that person decides how your personal data is used. You can reach us at <Mail />.
      </p>,
    ],
  },
  {
    heading: 'What we collect',
    blocks: [
      'Information you give us:',
      [
        'Account details: name, email address, and a password (stored only as a hash).',
        'Profile details you choose to add: avatar, banner image and bio.',
        'Content you post: recipes and their photos, comments, likes, saved recipes, and who you follow.',
        'Messages you send and receive, including images shared in chats, and your notifications.',
        'AI assistant prompts and any AI-generated recipes you choose to save.',
      ],
      'Information collected automatically:',
      [
        'Your IP address, which our servers and rate limiter use to prevent abuse. Rate-limit counters are short-lived.',
        'Standard server logs kept by our hosting providers, such as request time, path and IP address.',
      ],
      'We do not use advertising trackers or analytics services.',
    ],
  },
  {
    heading: 'Cookies and browser storage',
    blocks: [
      'We set one cookie: a secure, httpOnly refresh cookie that keeps you signed in. It is not used for advertising or tracking. Your short-lived access token is held in the page\u2019s memory and disappears when you close or reload the tab.',
    ],
  },
  {
    heading: 'How we use your data',
    blocks: [
      [
        'To create and secure your account, and to send verification, password-reset and account emails.',
        'To show your profile and content to other users, and to deliver messages and notifications.',
        'To run the AI assistant and enforce its daily limits.',
        'To detect and prevent abuse, spam and attacks.',
      ],
      'We do not sell your personal data or use it for advertising.',
    ],
  },
  {
    heading: 'AI recipe assistant',
    blocks: [
      'When you send a prompt, our server forwards it to ElaAI, a separate recipe service run by the same developer. ElaAI sends the prompt to Google Gemini to generate the recipe. Recipe photos are stock images from Pexels. Do not include personal information in a prompt.',
      'ElaAI stores submitted prompts and does not currently delete them automatically. Google handles prompts under its own terms, and on some free tiers may use them to improve its products. Recipes you save are stored in our database, are visible only to you, and are deleted with your account.',
    ],
  },
  {
    heading: 'Who else receives data',
    blocks: [
      'We use these service providers to run the site. Each receives only what it needs:',
      [
        'Vercel hosts the website and Render hosts the API.',
        'Our PostgreSQL database provider stores account and content data.',
        'Upstash (Redis) stores rate-limit and daily-quota counters.',
        'Cloudinary stores uploaded images.',
        'Our email provider delivers transactional emails.',
        'ElaAI, Google Gemini and Pexels support the AI assistant, as described above.',
        'TheMealDB: some pages load recipe data directly from TheMealDB in your browser, and Pexels photos load from Pexels, so those services receive your IP address and browser details.',
      ],
      'We may disclose data if required by law or to protect users and the service.',
    ],
  },
  {
    heading: 'How long we keep data',
    blocks: [
      'We keep your data while your account exists. If you delete your account, it is scheduled for deletion and can be restored during a 14-day recovery window. After that, your account and the content tied to it are permanently deleted. Copies in backups or provider logs may persist for a short time afterwards.',
      'Prompts held by ElaAI are covered in section 5.',
    ],
  },
  {
    heading: 'Your rights',
    blocks: [
      'You can view and edit most of your data in Settings and on your profile, and delete your account there. You may also ask us to access, correct or erase your personal data, or to withdraw your consent, by emailing us. We will respond within a reasonable time. Withdrawing consent may mean we can no longer provide your account.',
    ],
  },
  {
    heading: 'Security',
    blocks: [
      'Passwords are hashed, sessions use short-lived tokens, and requests are rate limited. No system is completely secure, so we cannot guarantee absolute security. If a breach affects you, we will notify you as the law requires.',
    ],
  },
  {
    heading: 'Children',
    blocks: [
      'Foo D Valley is not intended for anyone under 18. If you believe a child has created an account, email us and we will remove it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    blocks: [
      'We may update this policy. The date at the top shows the latest version, and we will give notice of significant changes on the site.',
    ],
  },
  {
    heading: 'Contact and grievances',
    blocks: [
      <p>
        For questions, requests or complaints about your data, email <Mail />. See also our{' '}
        <Link to="/terms">Terms of Service</Link>.
      </p>,
    ],
  },
]

const Privacy = () => (
  <LegalPage
    title="Privacy Policy"
    updated="October 24, 2026"
    intro="This policy explains what personal data Foo D Valley collects, why, and the choices you have."
    sections={SECTIONS}
  />
)

export default Privacy