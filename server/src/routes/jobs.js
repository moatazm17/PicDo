const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Job = require('../models/Job');
const User = require('../models/User');
const VisionService = require('../services/visionService');
const AIService = require('../services/aiService');
const ImageService = require('../services/imageService');
const RateLimiter = require('../middleware/rateLimiter');
const { detectUiLang } = require('../utils/lang');

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

// GET /check-limit - Check if user can upload
router.get('/check-limit', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const uiLang = detectUiLang(req.headers['accept-language']);
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'missing_user_id', 
        message: 'x-user-id header is required' 
      });
    }

    const monthlyLimit = parseInt(process.env.MONTHLY_LIMIT) || 50;
    const limitCheck = await RateLimiter.checkMonthlyLimit(userId, monthlyLimit);
    
    // Calculate reset date (first day of next month)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    res.json({
      allowed: !limitCheck.isLimitReached,
      used: limitCheck.currentCount || 0,
      limit: monthlyLimit,
      remaining: Math.max(0, monthlyLimit - (limitCheck.currentCount || 0)),
      resetDate: resetDate.toISOString().split('T')[0], // YYYY-MM-DD format
      message: limitCheck.isLimitReached ? RateLimiter.getLimitMessage(uiLang) : null
    });
    
  } catch (error) {
    console.error('Check limit error:', error);
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to check upload limit' 
    });
  }
});

// POST /jobs - Create new job
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('=== JOB CREATION START ===');
    const userId = req.headers['x-user-id'];
    const uiLang = detectUiLang(req.headers['accept-language']);
    console.log('Lang detect', { header: req.headers['accept-language'], uiLang });
    const wantThumb = req.body.wantThumb === 'true';
    const source = req.body.source || 'picker';
    
    console.log('Request details:', {
      userId,
      uiLang,
      wantThumb,
      source,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileType: req.file?.mimetype
    });

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

    // Check maintenance mode
    if (process.env.MAINTENANCE_MODE === 'true') {
      return res.status(503).json({
        error: 'maintenance_mode',
        message: 'Service temporarily unavailable for maintenance. Please try again later.'
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
        message: RateLimiter.getLimitMessage(uiLang)
      });
    }

    // Validate image format
    try {
      console.log('Validating image format...');
      await ImageService.validateImageFormat(req.file.buffer);
      console.log('Image validation passed');
    } catch (error) {
      console.error('Image validation failed:', error);
      throw error;
    }

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

    console.log('Saving job to database...');
    await job.save();
    console.log('Job saved successfully');

    // Process in background
    console.log('Starting background processing...');
    processJobAsync(job, req.file.buffer, wantThumb, uiLang);

    // Ensure user exists
    console.log('Updating user record...');
    await User.findOneAndUpdate(
      { userId },
      { userId, lang: uiLang },
      { upsert: true, new: true }
    );
    console.log('User record updated');

    console.log('=== JOB CREATION SUCCESS ===');
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
      isFavorite: job.isFavorite || false,
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

    // Update fields and/or summary
    if (fields) {
      job.fields = { ...job.fields, ...fields };
    }
    if (req.body.summary) {
      job.summary = req.body.summary;
    }
    
    job.updatedAt = new Date();
    await job.save();

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

// DELETE /jobs/:jobId - Delete a job
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.headers['x-user-id'];

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

    await Job.deleteOne({ jobId, userId });

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to delete job'
    });
  }
});

// POST /jobs/:jobId/favorite - Toggle favorite status
router.post('/:jobId/favorite', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.headers['x-user-id'];
    const { isFavorite } = req.body;

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

    job.isFavorite = isFavorite;
    job.updatedAt = new Date();
    await job.save();

    res.json({
      success: true,
      jobId: job.jobId,
      isFavorite: job.isFavorite
    });

  } catch (error) {
    console.error('Favorite toggle error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to toggle favorite'
    });
  }
});

// Background job processing
async function processJobAsync(job, imageBuffer, wantThumb, uiLang) {
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
    const classification = await aiService.classifyText(ocrResult.text, uiLang);
    console.log(`Job ${job.jobId}: Classification completed, type: ${classification.type}`);
    
    job.type = classification.type;
    job.classification = classification;
    job.fields = extractFieldsByType(classification);
    job.summary = classification.summary || aiService.generateSummary(classification);
    job.status = 'ready';
    
    console.log(`Job ${job.jobId}: Extracted fields:`, JSON.stringify(job.fields));
    console.log(`Job ${job.jobId}: Summary (UI lang):`, job.summary);
    console.log(`Job ${job.jobId}: Fields title (original):`, job.fields?.title);
    console.log(`Job ${job.jobId}: Status updated to ready`);
    await job.save();

  } catch (error) {
    console.error(`Job ${job.jobId}: Processing error:`, error);
    
    let errorCode = 'processing_failed';
    let errorMessage = error.message;
    
    // Map specific error types
    if (error.message.includes('Content not suitable for processing')) {
      errorCode = 'inappropriate_content';
      errorMessage = 'Content not suitable for processing';
    } else if (error.message.includes('No text detected')) {
      errorCode = 'no_text_detected';
    }
    
    job.status = 'failed';
    job.error = {
      code: errorCode,
      message: errorMessage
    };
    
    console.log(`Job ${job.jobId}: Status updated to failed: ${errorMessage}`);
    await job.save();
  }
}

function extractFieldsByType(classification) {
  const { type } = classification;
  
  // Get title from either top-level or fields
  const title = classification.title || classification.fields?.title;
  
  switch (type) {
    case 'event':
      return {
        title: title,
        date: classification.event?.date || classification.fields?.date,
        time: classification.event?.time || classification.fields?.time,
        location: classification.event?.location || classification.fields?.location,
        url: classification.event?.url || classification.fields?.url
      };
    
    case 'expense':
      return {
        title: title,
        amount: classification.expense?.amount || classification.fields?.amount,
        currency: classification.expense?.currency || classification.fields?.currency,
        merchant: classification.expense?.merchant || classification.fields?.merchant,
        date: classification.expense?.date || classification.fields?.date
      };
    
    case 'contact':
      return {
        title: title,
        name: classification.contact?.name || classification.fields?.name,
        phone: classification.contact?.phone || classification.fields?.phone,
        email: classification.contact?.email || classification.fields?.email
      };
    
    case 'address':
      return {
        title: title,
        full: classification.address?.full || classification.fields?.full,
        mapsQuery: classification.address?.mapsQuery || classification.fields?.mapsQuery
      };
      
    case 'note':
      return {
        title: title,
        content: classification.note?.content || classification.fields?.content,
        category: classification.note?.category || classification.fields?.category
      };
    
    case 'document':
      return {
        title: title,
        content: classification.document?.content || classification.fields?.content,
        category: classification.document?.category || classification.fields?.category
      };
    
    default:
      return { title: title };
  }
}

module.exports = router;
