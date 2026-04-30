// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Paper = require('../models/Paper');
const Review = require('../models/Review');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, user: req.user });
});

/**
 * GET /reviewers
 * Admin gets list of all reviewers
 */
router.get('/reviewers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const reviewers = await User.find({ role: 'reviewer' }).select(
      'name email expertise createdAt'
    );
    res.json({ success: true, reviewers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * GET /stats
 * Admin gets platform statistics
 */
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      totalPapers,
      pendingPapers,
      underReviewPapers,
      acceptedPapers,
      rejectedPapers,
      totalReviewers,
      totalAuthors,
      totalReviews,
    ] = await Promise.all([
      Paper.countDocuments(),
      Paper.countDocuments({ status: 'pending' }),
      Paper.countDocuments({ status: 'under_review' }),
      Paper.countDocuments({ status: 'accepted' }),
      Paper.countDocuments({ status: 'rejected' }),
      User.countDocuments({ role: 'reviewer' }),
      User.countDocuments({ role: 'author' }),
      Review.countDocuments(),
    ]);

    res.json({
      success: true,
      stats: {
        totalPapers,
        pendingPapers,
        underReviewPapers,
        acceptedPapers,
        rejectedPapers,
        totalReviewers,
        totalAuthors,
        totalReviews,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'Server error fetching stats.' });
  }
});

router.get('/authors', authenticate, authorize('admin'), async (req, res) => {
  try {
    const authors = await User.find({ role: 'author' }).select('name email');

    res.json({
      success: true,
      authors,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authors',
    });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be deleted',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `${user.role} deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
});

router.delete(
  '/users/:id',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

module.exports = router;
