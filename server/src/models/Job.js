const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['received', 'ocr_in_progress', 'ocr_done', 'ai_in_progress', 'ready', 'failed'],
    default: 'received',
    index: true
  },
  source: {
    type: String,
    enum: ['share', 'picker'],
    default: 'picker'
  },
  ocrText: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['event', 'expense', 'contact', 'address', 'note', 'document', null],
    default: null
  },
  classification: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  fields: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  summary: {
    type: String,
    default: ''
  },
  thumb: {
    type: String,
    default: null
  },
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  action: {
    applied: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['calendar', 'expense', 'contact', 'maps', 'note', 'document', null],
      default: null
    },
    appliedAt: {
      type: Date,
      default: null
    }
  },
  error: {
    code: {
      type: String,
      default: null
    },
    message: {
      type: String,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Job', jobSchema);
