// models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    // 1 = Very Poor, 5 = Excellent
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: 20,
    maxlength: 5000,
  },
  recommendation: {
    type: String,
    enum: ['accept', 'reject', 'major_revision', 'minor_revision'],
    required: [true, 'Recommendation is required'],
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one review per reviewer per paper
ReviewSchema.index({ paperId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
