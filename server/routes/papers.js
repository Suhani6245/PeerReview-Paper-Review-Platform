const express = require('express');
const path = require('path');
const axios = require('axios');
const router = express.Router();
const Paper = require('../models/Paper');
const User = require('../models/User');
const Review = require('../models/Review');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * POST /submit-paper
 * Author submits paper with PDF upload (Cloudinary)
 */
router.post(
  '/submit-paper',
  authenticate,
  authorize('author'),
  upload.single('pdf'),
  async (req, res) => {
    try {
      // ✅ FIX: safe file check for Cloudinary
      if (!req.file?.path) {
        return res.status(400).json({
          success: false,
          message: 'PDF file is required or upload failed.',
        });
      }

      const { title, abstract, keywords } = req.body;

      if (!title || !abstract) {
        return res.status(400).json({
          success: false,
          message: 'Title and abstract are required.',
        });
      }

      // ✅ FIX: convert comma string → array safely
      const keywordArray = keywords
        ? keywords
            .split(',')
            .map(k => k.trim())
            .filter(Boolean)
        : [];

      const fileUrl = req.file?.secure_url || req.file?.url || req.file?.path;
      const publicId = req.file?.public_id || req.file?.filename;

      if (!fileUrl) {
        console.error('[UPLOAD_ERROR]', 'Missing file URL on upload', req.file);
        return res.status(500).json({
          success: false,
          message: 'Upload failed: no file URL returned from storage.',
        });
      }

      const paper = await Paper.create({
        title,
        abstract,
        keywords: keywordArray,
        fileUrl,
        publicId,
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
      console.error('[SUBMIT_PAPER_ERROR]', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error during paper submission.',
      });
    }
  }
);

/**
 * GET /my-papers
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
      console.error('[MY_PAPERS_ERROR]', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error fetching papers.',
      });
    }
  }
);

/**
 * GET /assigned-papers
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
      console.error('[ASSIGNED_PAPERS_ERROR]', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error fetching assigned papers.',
      });
    }
  }
);

/**
 * GET /all-papers
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
      console.error('[ALL_PAPERS_ERROR]', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error fetching all papers.',
      });
    }
  }
);

/**
 * POST /assign-reviewers
 */
router.post(
  '/assign-reviewers',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { paperId } = req.body;

      if (!paperId) {
        return res.status(400).json({
          success: false,
          message: 'Paper ID is required.',
        });
      }

      const paper = await Paper.findById(paperId);

      if (!paper) {
        return res.status(404).json({
          success: false,
          message: 'Paper not found.',
        });
      }

      if (paper.reviewers?.length >= 2) {
        return res.status(400).json({
          success: false,
          message: 'Reviewers already assigned.',
        });
      }

      const reviewers = await User.find({
        role: 'reviewer',
        _id: { $ne: paper.authorId },
      });

      if (reviewers.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Not enough reviewers.',
        });
      }

      const selected = reviewers.sort(() => 0.5 - Math.random()).slice(0, 2);

      paper.reviewers = selected.map(r => r._id);
      paper.status = 'under_review';

      await paper.save();

      await paper.populate('reviewers', 'name email expertise');
      await paper.populate('authorId', 'name email');

      res.json({
        success: true,
        message: `Assigned ${selected.map(r => r.name).join(' and ')}`,
        paper,
      });
    } catch (err) {
      console.error('[ASSIGN_ERROR]', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error assigning reviewers.',
      });
    }
  }
);

/**
 * POST /final-decision
 */
router.post(
  '/final-decision',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { paperId, decision, comments } = req.body;

      if (!paperId || !decision) {
        return res.status(400).json({
          success: false,
          message: 'Paper ID and decision required.',
        });
      }

      if (!['accept', 'reject'].includes(decision)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid decision.',
        });
      }

      const paper = await Paper.findById(paperId);

      if (!paper) {
        return res.status(404).json({
          success: false,
          message: 'Paper not found.',
        });
      }

      const reviewCount = await Review.countDocuments({ paperId });

      if (reviewCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'No reviews yet.',
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
        message: `Paper ${decision}ed successfully.`,
        paper,
      });
    } catch (err) {
      console.error('[FINAL_DECISION_ERROR]', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error finalizing decision.',
      });
    }
  }
);

/**
 * GET /paper/:id
 */
router.get('/paper/:id', authenticate, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id)
      .populate('authorId', 'name email')
      .populate('reviewers', 'name email expertise');

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found.',
      });
    }

    const isAuthor = paper.authorId?._id?.toString() === req.user._id.toString();
    const isReviewer = paper.reviewers?.some(
      (r) => r._id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isReviewer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    const reviews = await Review.find({ paperId: paper._id }).populate(
      'reviewerId',
      'name email expertise'
    );

    res.json({
      success: true,
      paper: { ...paper.toObject(), reviews },
    });
  } catch (err) {
    console.error('[GET_PAPER_ERROR]', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching paper.',
    });
  }
});

/**
 * GET /paper/:id/download
 * Handle PDF downloads from Cloudinary or local storage
 */
router.get('/paper/:id/download', authenticate, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found.' });
    }

    const isAuthor = paper.authorId?.toString() === req.user._id.toString();
    const isReviewer = paper.reviewers?.some(
      (reviewerId) => reviewerId.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isReviewer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!paper.fileUrl) {
      return res.status(404).json({ success: false, message: 'PDF not available.' });
    }

    const filename = paper.fileName || 'paper.pdf';
    const fileUrl = paper.fileUrl;
    console.log('[DOWNLOAD_REQUEST]', { id: req.params.id, fileUrl, filename });

    // ✅ Cloudinary URL - valid Cloudinary resource
    if (fileUrl.startsWith('https://res.cloudinary.com/')) {
      console.log('[CLOUDINARY_DOWNLOAD]', fileUrl);
      try {
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        response.data.pipe(res);
      } catch (err) {
        console.error('[CLOUDINARY_STREAM_ERROR]', err.message);
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            message: 'Failed to stream from Cloudinary.',
          });
        }
      }
    }
    // ✅ Local file path - legacy uploads from previous system
    else if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      console.log('[LOCAL_DOWNLOAD]', fileUrl);
      const normalizedPath = fileUrl.replace(/^\/+/, '');
      const localFilePath = path.join(__dirname, '..', normalizedPath);
      res.download(localFilePath, filename, (err) => {
        if (err) {
          console.error('[LOCAL_FILE_ERROR]', err.message);
          if (!res.headersSent) {
            res.status(404).json({
              success: false,
              message: 'File not found on server.',
            });
          }
        }
      });
    }
    // ❌ Invalid URL format - database corruption or missing upload
    else {
      console.error('[INVALID_URL_FORMAT]', fileUrl);
      res.status(400).json({
        success: false,
        message: 'Invalid file URL format in database.',
        fileUrl,
      });
    }
  } catch (err) {
    console.error('[DOWNLOAD_ERROR]', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Download failed.',
      });
    }
  }
});

module.exports = router;
