const path = require('path');
const cloudinary = require('cloudinary').v2;
const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUDINARY_URL) {
  cloudinary.config(CLOUDINARY_URL);
} else if (
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
} else {
  const missing = [];
  if (!CLOUDINARY_URL) {
    if (!CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
  }
  throw new Error(
    'Missing Cloudinary configuration. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET. Missing: ' +
      missing.join(', ')
  );
}

module.exports = cloudinary;
