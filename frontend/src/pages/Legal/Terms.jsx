import React from 'react'
import { Link } from 'react-router-dom'
import LegalPage, { Mail } from '../../components/LegalPage/LegalPage'

const SECTIONS = [
  {
    heading: 'Acceptance',
    blocks: [
      <p>
        By creating an account or using Foo D Valley, you agree to these terms and to our{' '}
        <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.
      </p>,
    ],
  },
  {
    heading: 'The service',
    blocks: [
      'Foo D Valley lets you browse recipes, post your own, and interact with other members. It is provided free of charge and "as is". It may be slow, unavailable, changed or discontinued at any time, and features such as daily limits may change without notice.',
    ],
  },
  {
    heading: 'Accounts',
    blocks: [
      [
        'You must be at least 18 years old.',
        'Give accurate information and keep your password secure. You are responsible for activity on your account.',
        'Some features require a verified email address.',
        'You can delete your account in Settings. Deleted accounts can be restored within 14 days; after that, deletion is permanent.',
      ],
    ],
  },
  {
    heading: 'Your content',
    blocks: [
      'You keep ownership of the recipes, photos, comments and messages you post. By posting, you give Foo D Valley a non-exclusive, worldwide, royalty-free licence to store, display and distribute that content within the service so it can operate. This licence ends when you delete the content or your account, except for copies already shared with others, such as messages.',
      'You are responsible for your content. Only post what you have the right to share, and do not post content that is unlawful, infringing, hateful, harassing, sexually explicit, or that exposes someone else\u2019s private information.',
    ],
  },
  {
    heading: 'Acceptable use',
    blocks: [
      'You agree not to:',
      [
        'spam, harass or impersonate other people;',
        'scrape the service, probe it for vulnerabilities, or attempt to bypass rate limits, quotas or access controls;',
        'upload malware or interfere with the service or other users;',
        'use the AI assistant to generate unlawful, harmful or deceptive content.',
      ],
    ],
  },
  {
    heading: 'Recipes, safety and allergies',
    blocks: [
      'Recipes come from members, from the TheMealDB catalog, and from an AI assistant. We do not test, verify or endorse any of them. Ingredient lists may omit allergens, cooking times and temperatures may be wrong, and nothing here is medical, dietary or nutritional advice. Check ingredients against your own allergies and food safety practices before you cook.',
    ],
  },
  {
    heading: 'AI assistant',
    blocks: [
      'AI-generated recipes can be inaccurate, unsafe or nonsensical. You are responsible for checking them before use. The assistant is limited per account per day and may be unavailable. Prompts are processed by third parties as described in the Privacy Policy.',
    ],
  },
  {
    heading: 'Third-party content',
    blocks: [
      'Catalog recipes and their images are provided by TheMealDB, and AI recipe photos by Pexels. We do not control them and are not responsible for their accuracy or availability. Links to external sites are provided for convenience.',
    ],
  },
  {
    heading: 'Reports and removal',
    blocks: [
      <p>
        To report content that infringes your rights or breaks these terms, email <Mail /> with a
        link to the content and a short explanation. We may remove content or suspend accounts that
        break these terms, with or without notice.
      </p>,
    ],
  },
  {
    heading: 'Disclaimer and limit of liability',
    blocks: [
      'To the fullest extent permitted by law, we provide the service without warranties of any kind, and we are not liable for any indirect or consequential loss, loss of data, or harm arising from your use of the service or from recipes and content on it. Nothing in these terms excludes liability that cannot be excluded under applicable law.',
    ],
  },
  {
    heading: 'Governing law',
    blocks: [
      'These terms are governed by the laws of India. Courts located in Malappuram, Kerala, India have jurisdiction over any dispute, subject to any mandatory rights you have under applicable law.',
    ],
  },
  {
    heading: 'Changes',
    blocks: [
      'We may update these terms. The date at the top shows the latest version. Continued use after a change means you accept it.',
    ],
  },
  {
    heading: 'Contact',
    blocks: [<p>Questions about these terms: <Mail />.</p>],
  },
]

const Terms = () => (
  <LegalPage
    title="Terms of Service"
    updated="October 24, 2026"
    intro="These terms govern your use of Foo D Valley. Please read them before creating an account."
    sections={SECTIONS}
  />
)

export default Terms