const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Shared multer safety options — file size cap + mimetype filter, applied
// the same way regardless of which folder the upload is headed to.
const MULTER_OPTIONS = {
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Use JPG, PNG, or WEBP.'))
    }
    cb(null, true)
  },
}

/**
 * Builds a dedicated multer/CloudinaryStorage instance for one folder +
 * transform. Previously every upload (recipe/avatar/banner) shared a
 * single storage instance hardcoded to foodvalley/recipes — avatar and
 * banner files landed in the wrong folder, then got manually re-uploaded
 * a second time into the correct one, leaking an orphaned copy in
 * foodvalley/recipes on every single avatar/banner change. Each upload
 * target now gets its own instance, uploading directly to the right
 * place with the right transform, once.
 */
function buildUpload(folder, transformation) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation,
    },
  })
  return multer({ storage, ...MULTER_OPTIONS })
}

const recipeUpload = buildUpload('foodvalley/recipes', [{ width: 800, height: 600, crop: 'limit' }])
const avatarUpload = buildUpload('foodvalley/avatars', [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }])
const bannerUpload = buildUpload('foodvalley/banners', [{ width: 1200, height: 400, crop: 'fill' }])

// Catches Multer/Cloudinary upload failures (bad format, size limit, etc.)
// and returns clean JSON instead of an unhandled error object.
const handleUploadError = (err, req, res, next) => {
  if (err) {
    console.error('Upload error:', err)
    return res.status(400).json({
      message: err.message || 'Image upload failed. Please use JPG, PNG, or WEBP.',
    })
  }
  next()
}

module.exports = { cloudinary, recipeUpload, avatarUpload, bannerUpload, handleUploadError }