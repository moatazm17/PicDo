const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Job = require('../models/Job');
const User = require('../models/User');
const VisionService = require('../services/visionService');
const AIService = require('../services/aiService');
const ImageService = require('../services/imageService');
const RateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize services
const visionService = new VisionService();
const aiService = new AIService();

// POST /jobs - Create new job
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const language = req.headers['accept-language'] === 'ar' ? 'ar' : 'en';
    const wantThumb = req.body.wantThumb === 'true';
    const source = req.body.source || 'picker';

    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'x-user-id header is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'missing_image',
        message: 'Image file is required'
      });
    }

    // Check monthly limit
    const limitCheck = await RateLimiter.checkMonthlyLimit(
      userId, 
      parseInt(process.env.MONTHLY_LIMIT) || 50
    );

    if (limitCheck.isLimitReached) {
      return res.status(429).json({
        error: 'limit_reached',
        message: RateLimiter.getLimitMessage(language)
      });
    }

    // Validate image format
    await ImageService.validateImageFormat(req.file.buffer);

    // Create job record
    const jobId = uuidv4();
    const job = new Job({
      jobId,
      userId,
      source,
      status: 'received',
      type: null,
      action: {
        applied: false,
        type: null,
        appliedAt: null
      }
    });

    await job.save();

    // Process in background
    processJobAsync(job, req.file.buffer, wantThumb, language);

    // Ensure user exists
    await User.findOneAndUpdate(
      { userId },
      { userId, lang: language },
      { upsert: true, new: true }
    );

    res.status(202).json({
      jobId,
      status: 'received'
    });

  } catch (error) {
    console.error('Job creation error:', error);
    // Log detailed validation errors if present
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors));
    }
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to create job'
    });
  }
});

// GET /jobs/:jobId - Get job status
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.headers['x-user-id'];

    const job = await Job.findOne({ jobId, userId });
    
    if (!job) {
      return res.status(404).json({
        error: 'job_not_found',
        message: 'Job not found'
      });
    }

    const response = {
      jobId: job.jobId,
      status: job.status,
      type: job.type,
      fields: job.fields,
      summary: job.summary,
      thumb: job.thumb,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };

    if (job.error && job.error.code) {
      response.error = job.error;
    }

    res.json(response);

  } catch (error) {
    console.error('Job fetch error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to fetch job'
    });
  }
});

// PATCH /jobs/:jobId - Update job fields
router.patch('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.headers['x-user-id'];
    const { fields } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'x-user-id header is required'
      });
    }

    const job = await Job.findOne({ jobId, userId });
    
    if (!job) {
      return res.status(404).json({
        error: 'job_not_found',
        message: 'Job not found'
      });
    }

    // Update fields
    if (fields) {
      job.fields = { ...job.fields, ...fields };
      job.updatedAt = new Date();
      await job.save();
    }

    res.json({
      success: true,
      jobId: job.jobId,
      fields: job.fields
    });

  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to update job'
    });
  }
});

// POST /jobs/:jobId/mark-action - Mark action as applied
router.post('/:jobId/mark-action', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.headers['x-user-id'];
    const { applied, type } = req.body;

    const job = await Job.findOne({ jobId, userId });
    
    if (!job) {
      return res.status(404).json({
        error: 'job_not_found',
        message: 'Job not found'
      });
    }

    job.action = {
      applied: applied === true,
      type: type || null,
      appliedAt: applied ? new Date() : null
    };

    await job.save();

    res.json({ ok: true });

  } catch (error) {
    console.error('Mark action error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to mark action'
    });
  }
});

// Background job processing
async function processJobAsync(job, imageBuffer, wantThumb, language) {
  try {
    console.log(`Processing job ${job.jobId} for user ${job.userId}`);
    
    // Update status to OCR in progress
    job.status = 'ocr_in_progress';
    await job.save();
    console.log(`Job ${job.jobId}: Status updated to ocr_in_progress`);

    // Compress image for OCR
    const compressedImage = await ImageService.compressImage(imageBuffer);
    console.log(`Job ${job.jobId}: Image compressed for OCR`);

    // Extract text using Google Vision
    console.log(`Job ${job.jobId}: Starting Google Vision OCR`);
    const ocrResult = await visionService.extractTextFromImage(compressedImage);
    job.ocrText = ocrResult.text;
    job.status = 'ocr_done';
    await job.save();
    console.log(`Job ${job.jobId}: OCR completed, text length: ${ocrResult.text.length}`);

    // Create thumbnail if requested
    if (wantThumb) {
      job.thumb = await ImageService.createThumbnail(imageBuffer);
    }

    // Update status to AI in progress
    job.status = 'ai_in_progress';
    await job.save();
    console.log(`Job ${job.jobId}: Status updated to ai_in_progress`);

    // Classify with AI
    console.log(`Job ${job.jobId}: Starting OpenAI classification`);
    const classification = await aiService.classifyText(ocrResult.text, language);
    console.log(`Job ${job.jobId}: Classification completed, type: ${classification.type}`);
    
    job.type = classification.type;
    job.classification = classification;
    job.fields = extractFieldsByType(classification);
    job.summary = classification.summary || aiService.generateSummary(classification);
    job.status = 'ready';
    
    console.log(`Job ${job.jobId}: Extracted fields:`, JSON.stringify(job.fields));
    console.log(`Job ${job.jobId}: Status updated to ready`);
    await job.save();

  } catch (error) {
    console.error(`Job ${job.jobId}: Processing error:`, error);
    
    job.status = 'failed';
    job.error = {
      code: 'processing_failed',
      message: error.message
    };
    
    console.log(`Job ${job.jobId}: Status updated to failed: ${error.message}`);
    await job.save();
  }
}

function extractFieldsByType(classification) {
  const { type } = classification;
  
  switch (type) {
    case 'event':
      return {
        title: classification.title,
        date: classification.event.date,
        time: classification.event.time,
        location: classification.event.location,
        url: classification.event.url
      };
    
    case 'expense':
      return {
        title: classification.title,
        amount: classification.expense.amount,
        currency: classification.expense.currency,
        merchant: classification.expense.merchant,
        date: classification.expense.date
      };
    
    case 'contact':
      return {
        title: classification.title,
        name: classification.contact.name,
        phone: classification.contact.phone
      };
    
    case 'address':
      return {
        title: classification.title,
        full: classification.address.full,
        mapsQuery: classification.address.mapsQuery
      };
      
    case 'note':
      return {
        title: classification.title,
        content: classification.note.content,
        category: classification.note.category
      };
    
    default:
      return { title: classification.title };
  }
}

module.exports = router;
