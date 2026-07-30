const { z } = require('zod');
const { commonPasswords } = require('./commonPasswords');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(254);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((val) => !commonPasswords.has(val.toLowerCase()), {
    message: 'This password is too common. Choose something less predictable.',
  });

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be under 50 characters');

const registerSchema = z.object({ name, email, password });

const loginSchema = z.object({
  email,
  // Deliberately loose here — login should not leak password policy
  // to an attacker via a validation error. Just require it's present.
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password,
});

const resendVerificationSchema = z.object({ email });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  password, // exported for reuse in profile.validators.js (changePassword)
};