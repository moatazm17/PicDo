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
      
      // Perform SafeSearch, document text detection, and regular text detection in parallel
      const [ocrResult, safeSearchResult, textResult] = await Promise.all([
        // Document text detection (optimized for dense text)
        this.client.documentTextDetection({
          image: { content: imageBuffer },
          imageContext: {
            languageHints: ['en', 'ar'], // Support both English and Arabic
            textDetectionParams: {
              enableTextDetectionConfidenceScore: true
            }
          }
        }),
        // Safe search detection
        this.client.safeSearchDetection({
          image: { content: imageBuffer }
        }),
        // Regular text detection (better for sparse text like signs, logos)
        this.client.textDetection({
          image: { content: imageBuffer },
          imageContext: {
            languageHints: ['en', 'ar'] // Support both English and Arabic
          }
        })
      ]);

      // Check SafeSearch results first
      const safeSearch = safeSearchResult[0].safeSearchAnnotation;
      this.validateContentSafety(safeSearch);

      // Get text from both detection methods
      const docDetections = ocrResult[0].textAnnotations || [];
      const textDetections = textResult[0].textAnnotations || [];
      
      if ((!docDetections || docDetections.length === 0) && 
          (!textDetections || textDetections.length === 0)) {
        console.log('Vision API: No text detected in image');
        throw new Error('No text detected in image');
      }

      // Combine results from both methods for best coverage
      let fullText = '';
      
      // Document text detection is usually better for dense text
      if (docDetections && docDetections.length > 0) {
        fullText = docDetections[0].description;
      }
      
      // If text detection found something different, append it
      if (textDetections && textDetections.length > 0) {
        const textOnly = textDetections[0].description;
        if (textOnly && textOnly !== fullText) {
          // Combine texts if they're different
          fullText = fullText ? fullText + '\n\n' + textOnly : textOnly;
        }
      }
      
      console.log('Vision API: Text detected:', fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''));
      
      // Extract structured data from the OCR results
      const structuredData = this.extractStructuredData(ocrResult[0], textResult[0]);
      
      // Check text content for inappropriate material (temporarily disabled)
      // this.validateTextContent(fullText);
      
      return {
        text: fullText,
        confidence: this.calculateConfidence(ocrResult[0]),
        structuredData
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
  
  /**
   * Extract structured data like phone numbers, addresses, business info from OCR results
   * @param {Object} docResult - Document text detection result
   * @param {Object} textResult - Text detection result
   * @returns {Object} Structured data extracted from the image
   */
  extractStructuredData(docResult, textResult) {
    const structuredData = {
      phoneNumbers: [],
      emails: [],
      urls: [],
      addresses: [],
      businessInfo: {
        names: [],
        ratings: [],
        hours: [],
        categories: []
      }
    };
    
    // Extract all text blocks for analysis
    const allText = [];
    
    // Process document text blocks
    if (docResult.fullTextAnnotation && docResult.fullTextAnnotation.pages) {
      docResult.fullTextAnnotation.pages.forEach(page => {
        page.blocks?.forEach(block => {
          let blockText = '';
          
          block.paragraphs?.forEach(paragraph => {
            paragraph.words?.forEach(word => {
              const wordText = word.symbols?.map(symbol => symbol.text).join('') || '';
              blockText += wordText + ' ';
            });
          });
          
          if (blockText.trim()) {
            allText.push(blockText.trim());
          }
        });
      });
    }
    
    // Process individual text annotations (often better for sparse text)
    if (textResult && textResult.textAnnotations) {
      // Skip the first one as it's the full text
      for (let i = 1; i < textResult.textAnnotations.length; i++) {
        const annotation = textResult.textAnnotations[i];
        if (annotation.description && annotation.description.trim()) {
          allText.push(annotation.description.trim());
        }
      }
    }
    
    // Process each text block
    allText.forEach(text => {
      // Extract phone numbers - simplified to avoid regex stack depth issues
      let phoneMatches = text.match(/\+?[0-9]{7,15}/g);
      // Also allow short unified numbers like '2046' when context suggests it
      if (!phoneMatches || phoneMatches.length === 0) {
        const unifiedIndicators = /(الرقم\s*الموحد|Unified\s*Number|Call|للاستفسار)/i;
        const shortMatches = text.match(/\b\d{3,6}\b/g);
        if (unifiedIndicators.test(text) && shortMatches) {
          phoneMatches = shortMatches;
        }
      }
      if (phoneMatches) {
        phoneMatches.forEach(phone => {
          // Only add if it looks like a valid phone (at least 7 digits)
          if (phone.replace(/\D/g, '').length >= 7 || /\b\d{3,6}\b/.test(phone)) {
            structuredData.phoneNumbers.push(phone.trim());
          }
        });
      }
      
      // Extract emails
      const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatches) {
        emailMatches.forEach(email => {
          structuredData.emails.push(email.trim());
        });
      }
      
      // Extract URLs - simplified to avoid regex stack depth issues
      const urlMatches = text.match(/(https?:\/\/\S+)|(www\.\S+\.\S+)/g);
      if (urlMatches) {
        urlMatches.forEach(url => {
          structuredData.urls.push(url.trim());
        });
      }
      
      // Extract business hours - simplified to avoid regex stack depth issues
      const hoursMatches = text.match(/(?:open|opens|closed)\s+\d{1,2}(?::\d{2})?\s*[ap]m/i);
      if (hoursMatches) {
        structuredData.businessInfo.hours.push(hoursMatches[0].trim());
      }
      
      // Extract ratings (e.g., "4.2 stars", "★★★★☆", "(241 reviews)")
      const ratingMatches = text.match(/\d+\.\d+\s*(?:★|stars|rating)|[★⭐]{1,5}|[\(\[]?\d+\s*(?:reviews|ratings)[\)\]]?/i);
      if (ratingMatches) {
        structuredData.businessInfo.ratings.push(ratingMatches[0].trim());
      }
      
      // Extract business categories (common patterns in Arabic and English)
      const categoryMatches = text.match(/(?:مكتب|متجر|مطعم|فندق|شركة|مؤسسة|محل|agency|office|store|restaurant|hotel|company)/i);
      if (categoryMatches) {
        structuredData.businessInfo.categories.push(text.trim());
      }
      
      // Simple address detection - just look for location indicators
      if (text.includes('street') || text.includes('road') || text.includes('شارع') || 
          text.includes('طريق') || text.includes('حي') || text.includes('مدينة') ||
          text.includes('مقابل') || text.includes('بجوار')) {
        // Only add if it's more than just a single word
        if (text.trim().length > 5 && text.includes(' ')) {
          structuredData.addresses.push(text.trim());
        }
      }
    });
    
    // Remove duplicates
    structuredData.phoneNumbers = [...new Set(structuredData.phoneNumbers)];
    structuredData.emails = [...new Set(structuredData.emails)];
    structuredData.urls = [...new Set(structuredData.urls)];
    // Simple deduplication
    structuredData.addresses = [...new Set(structuredData.addresses)];
    structuredData.businessInfo.hours = [...new Set(structuredData.businessInfo.hours)];
    structuredData.businessInfo.ratings = [...new Set(structuredData.businessInfo.ratings)];
    structuredData.businessInfo.categories = [...new Set(structuredData.businessInfo.categories)];
    
    return structuredData;
  }
}

module.exports = VisionService;
