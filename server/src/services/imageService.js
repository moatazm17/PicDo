const sharp = require('sharp');

class ImageService {
  static async compressImage(buffer, maxSizeKB = 2048) {
    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Calculate target dimensions to keep under size limit
      let { width, height } = metadata;
      const maxDimension = 1920;
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      // Compress image
      let quality = 85;
      let compressedBuffer;
      
      do {
        compressedBuffer = await sharp(buffer)
          .resize(width, height, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality, progressive: true })
          .toBuffer();
        
        quality -= 5;
      } while (compressedBuffer.length > maxSizeKB * 1024 && quality > 20);
      
      return compressedBuffer;
    } catch (error) {
      console.error('Image compression error:', error);
      throw new Error('Failed to compress image');
    }
  }

  static async createThumbnail(buffer, maxSize = 512) {
    try {
      const thumbnail = await sharp(buffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 95 })
        .toBuffer();
      
      return thumbnail.toString('base64');
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      throw new Error('Failed to create thumbnail');
    }
  }

  static validateImageFormat(buffer) {
    const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
    
    return sharp(buffer)
      .metadata()
      .then(metadata => {
        console.log(`Image metadata: format=${metadata.format}, width=${metadata.width}, height=${metadata.height}`);
        if (!validFormats.includes(metadata.format)) {
          throw new Error(`Unsupported image format: ${metadata.format}`);
        }
        return true;
      })
      .catch(error => {
        console.error('Image validation error:', error);
        throw new Error(`Invalid image file: ${error.message}`);
      });
  }
}

module.exports = ImageService;
