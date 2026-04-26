// models/Paper.js
const mongoose = require('mongoose');

const PaperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: 5,
    maxlength: 300,
  },
  abstract: {
    type: String,
    required: [true, 'Abstract is required'],
    trim: true,
    minlength: 50,
    maxlength: 3000,
  },
  keywords: {
    type: String,
    trim: true,
    default: '',
  },
  fileUrl: {
    // Path to the uploaded PDF file
    type: String,
    required: [true, 'PDF file is required'],
  },
  fileName: {
    type: String,
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewers: [
    {
      // Array of reviewer user IDs assigned to this paper
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  status: {
    // Overall paper status
    type: String,
    enum: ['pending', 'under_review', 'accepted', 'rejected'],
    default: 'pending',
  },
  finalDecision: {
    decision: {
      type: String,
      enum: ['accept', 'reject', null],
      default: null,
    },
    comments: {
      type: String,
      default: '',
    },
    decidedAt: {
      type: Date,
    },
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Paper', PaperSchema);
