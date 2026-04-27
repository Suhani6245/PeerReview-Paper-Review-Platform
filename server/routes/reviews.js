// routes/reviews.js
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Paper = require('../models/Paper');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /submit-review
 * Reviewer submits a review for an assigned paper
 */
router.post(
  '/submit-review',
  authenticate,
  authorize('reviewer'),
  async (req, res) => {
    try {
      const { paperId, rating, comment, recommendation } = req.body;

      // Validate required fields
      if (!paperId || !rating || !comment || !recommendation) {
        return res.status(400).json({
          success: false,
          message:
            'Paper ID, rating, comment, and recommendation are all required.',
        });
      }

      // Validate rating range
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5.',
        });
      }

      // Check paper exists
      const paper = await Paper.findById(paperId);
      if (!paper) {
        return res
          .status(404)
          .json({ success: false, message: 'Paper not found.' });
      }

      // Ensure reviewer is assigned to this paper
      const isAssigned = paper.reviewers.some(
        (r) => r.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to review this paper.',
        });
      }

      // Check if already reviewed
      const existingReview = await Review.findOne({
        paperId,
        reviewerId: req.user._id,
      });
      if (existingReview) {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted a review for this paper.',
        });
      }

      // Create the review
      const review = await Review.create({
        paperId,
        reviewerId: req.user._id,
        rating: parseInt(rating),
        comment,
        recommendation,
      });

      await review.populate('reviewerId', 'name email expertise');

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully.',
        review,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key (unique index on paperId + reviewerId)
        return res.status(409).json({
          success: false,
          message: 'You have already reviewed this paper.',
        });
      }
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res
          .status(400)
          .json({ success: false, message: messages.join(', ') });
      }
      console.error('Submit review error:', err);
      res
        .status(500)
        .json({ success: false, message: 'Server error submitting review.' });
    }
  }
);

/**
 * GET /reviews/:paperId
 * Get all reviews for a specific paper (admin only)
 */
router.get(
  '/reviews/:paperId',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const reviews = await Review.find({ paperId: req.params.paperId })
        .populate('reviewerId', 'name email expertise')
        .sort({ submittedAt: -1 });

      res.json({ success: true, reviews });
    } catch (err) {
      console.error('Get reviews error:', err);
      res
        .status(500)
        .json({ success: false, message: 'Server error fetching reviews.' });
    }
  }
);

/**
 * GET /all-reviews
 * Admin gets all reviews in the system
 */
router.get(
  '/all-reviews',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const reviews = await Review.find()
        .populate('reviewerId', 'name email expertise')
        .populate('paperId', 'title status')
        .sort({ submittedAt: -1 });

      res.json({ success: true, reviews });
    } catch (err) {
      console.error('All reviews error:', err);
      res.status(500).json({
        success: false,
        message: 'Server error fetching all reviews.',
      });
    }
  }
);

module.exports = router;
