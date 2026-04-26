// routes/papers.js
const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const User = require('../models/User');
const Review = require('../models/Review');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * POST /submit-paper
 * Author submits a new paper with PDF upload
 */
router.post(
  '/submit-paper',
  authenticate,
  authorize('author'),
  upload.single('pdf'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'PDF file is required.' });
      }

      const { title, abstract, keywords } = req.body;

      if (!title || !abstract) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Title and abstract are required.',
          });
      }

      const paper = await Paper.create({
        title,
        abstract,
        keywords: keywords || '',
        fileUrl: req.file.filename,
        fileName: req.file.originalname,
        authorId: req.user._id,
        status: 'pending',
      });

      await paper.populate('authorId', 'name email');

      res.status(201).json({
        success: true,
        message: 'Paper submitted successfully.',
        paper,
      });
    } catch (err) {
      if (err.message === 'Only PDF files are allowed!') {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res
          .status(400)
          .json({ success: false, message: messages.join(', ') });
      }
      console.error('Submit paper error:', err);
      res
        .status(500)
        .json({
          success: false,
          message: 'Server error during paper submission.',
        });
    }
  }
);

/**
 * GET /my-papers
 * Author views their own submitted papers with reviews
 */
router.get(
  '/my-papers',
  authenticate,
  authorize('author'),
  async (req, res) => {
    try {
      const papers = await Paper.find({ authorId: req.user._id })
        .populate('authorId', 'name email')
        .populate('reviewers', 'name email expertise')
        .sort({ submittedAt: -1 });

      // Attach reviews to each paper
      const papersWithReviews = await Promise.all(
        papers.map(async (paper) => {
          const reviews = await Review.find({ paperId: paper._id }).populate(
            'reviewerId',
            'name email expertise'
          );
          return { ...paper.toObject(), reviews };
        })
      );

      res.json({ success: true, papers: papersWithReviews });
    } catch (err) {
      console.error('My papers error:', err);
      res
        .status(500)
        .json({ success: false, message: 'Server error fetching papers.' });
    }
  }
);

/**
 * GET /assigned-papers
 * Reviewer views papers assigned to them
 */
router.get(
  '/assigned-papers',
  authenticate,
  authorize('reviewer'),
  async (req, res) => {
    try {
      const papers = await Paper.find({ reviewers: req.user._id })
        .populate('authorId', 'name email')
        .populate('reviewers', 'name email expertise')
        .sort({ submittedAt: -1 });

      // Attach this reviewer's own review to each paper
      const papersWithMyReview = await Promise.all(
        papers.map(async (paper) => {
          const myReview = await Review.findOne({
            paperId: paper._id,
            reviewerId: req.user._id,
          });
          return { ...paper.toObject(), myReview };
        })
      );

      res.json({ success: true, papers: papersWithMyReview });
    } catch (err) {
      console.error('Assigned papers error:', err);
      res
        .status(500)
        .json({
          success: false,
          message: 'Server error fetching assigned papers.',
        });
    }
  }
);

/**
 * GET /all-papers
 * Admin views all papers with full review data
 */
router.get(
  '/all-papers',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const papers = await Paper.find()
        .populate('authorId', 'name email')
        .populate('reviewers', 'name email expertise')
        .sort({ submittedAt: -1 });

      const papersWithReviews = await Promise.all(
        papers.map(async (paper) => {
          const reviews = await Review.find({ paperId: paper._id }).populate(
            'reviewerId',
            'name email expertise'
          );
          return { ...paper.toObject(), reviews };
        })
      );

      res.json({ success: true, papers: papersWithReviews });
    } catch (err) {
      console.error('All papers error:', err);
      res
        .status(500)
        .json({ success: false, message: 'Server error fetching all papers.' });
    }
  }
);

/**
 * POST /assign-reviewers
 * Admin automatically assigns 2 reviewers per paper
 * Rules: no duplicates, reviewer != author
 */
router.post(
  '/assign-reviewers',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { paperId } = req.body;

      if (!paperId) {
        return res
          .status(400)
          .json({ success: false, message: 'Paper ID is required.' });
      }

      const paper = await Paper.findById(paperId);
      if (!paper) {
        return res
          .status(404)
          .json({ success: false, message: 'Paper not found.' });
      }

      if (paper.reviewers && paper.reviewers.length >= 2) {
        return res.status(400).json({
          success: false,
          message: 'Reviewers already assigned to this paper.',
        });
      }

      // Get all reviewers excluding the paper's author
      const availableReviewers = await User.find({
        role: 'reviewer',
        _id: { $ne: paper.authorId },
      });

      if (availableReviewers.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Not enough reviewers available (need at least 2).',
        });
      }

      // Randomly shuffle and pick 2 reviewers
      const shuffled = availableReviewers.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 2);
      const reviewerIds = selected.map((r) => r._id);

      // Update paper with reviewers and change status
      paper.reviewers = reviewerIds;
      paper.status = 'under_review';
      await paper.save();

      await paper.populate('reviewers', 'name email expertise');
      await paper.populate('authorId', 'name email');

      res.json({
        success: true,
        message: `Assigned ${selected.map((r) => r.name).join(' and ')} as reviewers.`,
        paper,
      });
    } catch (err) {
      console.error('Assign reviewers error:', err);
      res
        .status(500)
        .json({ success: false, message: 'Server error assigning reviewers.' });
    }
  }
);

/**
 * POST /final-decision
 * Admin gives the final accept/reject decision
 */
router.post(
  '/final-decision',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { paperId, decision, comments } = req.body;

      if (!paperId || !decision) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Paper ID and decision are required.',
          });
      }

      if (!['accept', 'reject'].includes(decision)) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Decision must be accept or reject.',
          });
      }

      const paper = await Paper.findById(paperId);
      if (!paper) {
        return res
          .status(404)
          .json({ success: false, message: 'Paper not found.' });
      }

      // Check that at least one review exists
      const reviewCount = await Review.countDocuments({ paperId: paper._id });
      if (reviewCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot decide on a paper with no reviews yet.',
        });
      }

      paper.finalDecision = {
        decision,
        comments: comments || '',
        decidedAt: new Date(),
      };
      paper.status = decision === 'accept' ? 'accepted' : 'rejected';
      await paper.save();

      await paper.populate('authorId', 'name email');
      await paper.populate('reviewers', 'name email');

      res.json({
        success: true,
        message: `Paper has been ${decision}ed.`,
        paper,
      });
    } catch (err) {
      console.error('Final decision error:', err);
      res
        .status(500)
        .json({
          success: false,
          message: 'Server error making final decision.',
        });
    }
  }
);

/**
 * GET /paper/:id
 * Get a single paper with all its reviews
 */
router.get('/paper/:id', authenticate, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id)
      .populate('authorId', 'name email')
      .populate('reviewers', 'name email expertise');

    if (!paper) {
      return res
        .status(404)
        .json({ success: false, message: 'Paper not found.' });
    }

    // Access control: author sees their own, reviewer sees assigned, admin sees all
    const isAuthor = paper.authorId._id.toString() === req.user._id.toString();
    const isReviewer = paper.reviewers.some(
      (r) => r._id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isReviewer && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied.' });
    }

    const reviews = await Review.find({ paperId: paper._id }).populate(
      'reviewerId',
      'name email expertise'
    );

    res.json({ success: true, paper: { ...paper.toObject(), reviews } });
  } catch (err) {
    console.error('Get paper error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server error fetching paper.' });
  }
});

module.exports = router;
