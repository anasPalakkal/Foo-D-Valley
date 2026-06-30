const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'foodvalley/recipes',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
})

const upload = multer({ storage })

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

module.exports = { cloudinary, upload, handleUploadError }