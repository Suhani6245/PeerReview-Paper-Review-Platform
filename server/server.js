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

// Serve uploaded PDFs
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Download route
app.get('/api/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'uploads', filename);

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
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in environment variables');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('✅ Connected to MongoDB');

    await seedAdmin();
    await seedDemoUsers();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

const seedDemoUsers = async () => {
  const User = require('./models/User');

  const demoUsers = [
    {
      name: 'Author Demo',
      email: 'author@demo.com',
      password: 'demo123',
      role: 'author',
    },
    {
      name: 'Reviewer Demo',
      email: 'reviewer@demo.com',
      password: 'demo123',
      role: 'reviewer',
      expertise: 'Machine Learning',
    },
  ];

  for (const userData of demoUsers) {
    const exists = await User.findOne({ email: userData.email });
    if (!exists) {
      await User.create(userData);
      console.log(`👤 Demo user created: ${userData.email} / ${userData.password}`);
    }
  }
};

startServer();
