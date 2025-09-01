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
      const [result] = await this.client.documentTextDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations;
      if (!detections || detections.length === 0) {
        throw new Error('No text detected in image');
      }

      // The first annotation contains the full detected text
      const fullText = detections[0].description;
      
      return {
        text: fullText,
        confidence: this.calculateConfidence(result)
      };
    } catch (error) {
      console.error('Vision API error:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
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
