const vision = require('@google-cloud/vision');

class VisionService {
  constructor() {
    // Initialize the client with credentials from environment
    if (process.env.GOOGLE_CLOUD_VISION_KEY) {
      // Use JSON key directly from environment (Railway deployment)
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CLOUD_VISION_KEY);
        this.client = new vision.ImageAnnotatorClient({ credentials });
      } catch (error) {
        throw new Error('Invalid GOOGLE_CLOUD_VISION_KEY JSON format');
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account file path (local development)
      this.client = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
    } else {
      throw new Error('Google Cloud Vision credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_VISION_KEY');
    }
  }

  async extractTextFromImage(imageBuffer) {
    try {
      console.log('Vision API: Starting content safety check and OCR');
      
      // Perform both SafeSearch and text detection in parallel for efficiency
      const [ocrResult, safeSearchResult] = await Promise.all([
        this.client.documentTextDetection({
          image: { content: imageBuffer }
        }),
        this.client.safeSearchDetection({
          image: { content: imageBuffer }
        })
      ]);

      // Check SafeSearch results first
      const safeSearch = safeSearchResult[0].safeSearchAnnotation;
      this.validateContentSafety(safeSearch);

      const detections = ocrResult[0].textAnnotations;
      if (!detections || detections.length === 0) {
        console.log('Vision API: No text detected in image');
        throw new Error('No text detected in image');
      }

      // The first annotation contains the full detected text
      const fullText = detections[0].description;
      console.log('Vision API: Text detected:', fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''));
      
      // Check text content for inappropriate material
      this.validateTextContent(fullText);
      
      return {
        text: fullText,
        confidence: this.calculateConfidence(ocrResult[0])
      };
    } catch (error) {
      console.error('Vision API error:', error);
      // Log more details about the error
      if (error.details) {
        console.error('Vision API error details:', error.details);
      }
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  validateContentSafety(safeSearch) {
    // Define safety thresholds
    const isUnsafe = 
      safeSearch.adult === 'VERY_LIKELY' || safeSearch.adult === 'LIKELY' ||
      safeSearch.violence === 'VERY_LIKELY' || safeSearch.violence === 'LIKELY' ||
      safeSearch.racy === 'VERY_LIKELY';

    if (isUnsafe) {
      console.log('Vision API: Inappropriate content detected', {
        adult: safeSearch.adult,
        violence: safeSearch.violence,
        racy: safeSearch.racy
      });
      throw new Error('Content not suitable for processing');
    }

    console.log('Vision API: Content safety check passed');
  }

  validateTextContent(text) {
    // List of inappropriate keywords/phrases to detect in text
    const inappropriatePatterns = [
      // Explicit sexual content
      /\b(cock|dick|penis|vagina|pussy|sex|sexual|porn|naked|nude)\b/i,
      // Profanity (common ones)  
      /\b(fuck|shit|bitch|ass|damn)\b/i,
      // Adult content indicators
      /\b(erotic|orgasm|masturbat|intercourse)\b/i,
      // Violence
      /\b(kill|murder|rape|assault|violence)\b/i
    ];

    const lowerText = text.toLowerCase();
    
    for (const pattern of inappropriatePatterns) {
      if (pattern.test(lowerText)) {
        console.log('Vision API: Inappropriate text content detected');
        throw new Error('Content not suitable for processing');
      }
    }
    
    console.log('Vision API: Text content safety check passed');
  }

  calculateConfidence(result) {
    // Calculate average confidence from detected text blocks
    if (!result.fullTextAnnotation || !result.fullTextAnnotation.pages) {
      return 0.5; // Default confidence
    }

    let totalConfidence = 0;
    let blockCount = 0;

    result.fullTextAnnotation.pages.forEach(page => {
      page.blocks?.forEach(block => {
        if (block.confidence !== undefined) {
          totalConfidence += block.confidence;
          blockCount++;
        }
      });
    });

    return blockCount > 0 ? totalConfidence / blockCount : 0.5;
  }
}

module.exports = VisionService;
