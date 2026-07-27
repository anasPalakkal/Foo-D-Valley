// Minimal blocklist of the most-reused passwords. This is not exhaustive —
// it's a cheap first filter that catches the worst offenders without
// pulling in a full 10k-entry wordlist dependency.
//
// If you want stronger coverage later, swap this for a proper list
// (e.g. the "10k most common passwords" list) or replace the refine()
// check in auth.validators.js with zxcvbn-based strength scoring.
const commonPasswords = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'letmein123',
  'welcome123',
  'admin1234',
  'iloveyou1',
  'abc123456',
  'football1',
  'baseball1',
  'monkey123',
  'dragon123',
  'sunshine1',
  'princess1',
  'trustno1',
  'superman1',
  'master123',
  'shadow123',
  'changeme1',
  'passw0rd',
  '11111111',
  '87654321',
]);

module.exports = { commonPasswords };