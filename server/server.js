// server.js - Main entry point for the Academic Paper Review Platform API
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const paperRoutes = require('./routes/papers');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
// Allow ALL origins so file://, Live Server, localhost all work without CORS errors
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded PDFs statically  →  GET /uploads/paper-xxx.pdf
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Dedicated DOWNLOAD route  →  GET /api/download/paper-xxx.pdf
// Forces browser "Save As" dialog instead of opening in tab
app.get('/api/download/:filename', (req, res) => {
  // path.basename strips any "../" tricks for security
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, '../uploads', filename);
  res.download(filePath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, message: 'File not found.' });
    }
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', paperRoutes);
app.use('/api', reviewRoutes);
app.use('/api', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PeerReview API is running.' });
});

// 404 — only for /api/* routes; /uploads/* is handled by static above
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res
      .status(400)
      .json({ success: false, message: 'File too large. Max size is 10MB.' });
  }
  res
    .status(500)
    .json({ success: false, message: err.message || 'Internal server error.' });
});

// ── Database + Start ──────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/academic_review'
    );
    console.log('✅ Connected to MongoDB');
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  const User = require('./models/User');
  const exists = await User.findOne({ role: 'admin' });
  if (!exists) {
    await User.create({
      name: 'Admin',
      email: 'admin@review.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('👤 Default admin created: admin@review.com / admin123');
  }
};

startServer();
