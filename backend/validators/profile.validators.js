const { z } = require('zod');
const { password } = require('./auth.validators');

// name/bio mirror register's name field constraints — displayed publicly,
// so length caps matter here as much as at registration.
const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50).optional(),
  bio: z.string().trim().max(500, 'Bio must be under 500 characters').optional().nullable(),
});

// Reuses the same password-strength + common-password-blocklist rule as
// registration, so "change password" can't be used to set a weaker
// password than "register" would allow in the first place.
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to delete your account'),
});

module.exports = { updateProfileSchema, changePasswordSchema, deleteAccountSchema };