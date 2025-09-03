import { API_BASE_URL } from '../constants/config';
import { getUserId } from '../utils/storage';
import { getCurrentLanguage } from '../utils/i18n';

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const userId = await getUserId();
      const language = getCurrentLanguage();

      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'accept-language': language,
          ...options.headers,
        },
        ...options,
      };

      console.log(`API Request: ${url}`);
      const response = await fetch(url, config);
      const data = await response.json();
      console.log(`API Response: ${JSON.stringify(data).substring(0, 200)}${data && JSON.stringify(data).length > 200 ? '...' : ''}`);

      if (!response.ok) {
        throw new APIError(data.error || 'api_error', data.message || 'Request failed', response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('API Network Error:', error);
      throw new APIError('network_error', 'Network request failed');
    }
  }

  async uploadImage(imageUri, wantThumb = true, source = 'picker', retryCount = 0) {
    const maxRetries = 3;
    const timeout = 30000; // 30 seconds

    try {
      const userId = await getUserId();
      const language = getCurrentLanguage();

      console.log(`📸 Uploading image from ${source}:`, imageUri);

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });
      formData.append('wantThumb', wantThumb.toString());
      formData.append('source', source);
      
      console.log(`🚀 Uploading to ${this.baseURL}/jobs with userId: ${userId}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.baseURL}/jobs`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'accept-language': language,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log(`📦 Upload response (${response.status}):`, JSON.stringify(data).substring(0, 300));

      if (!response.ok) {
        console.error(`❌ Upload failed with status ${response.status}:`, data);
        throw new APIError(data.error || 'upload_error', data.message || 'Upload failed', response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      console.error('API Upload Error:', error);
      
      // Retry logic for network errors
      if (retryCount < maxRetries && (
        error.name === 'AbortError' || 
        error.message.includes('Network request failed') ||
        error.message.includes('timeout')
      )) {
        console.log(`🔄 Retrying upload (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.uploadImage(imageUri, wantThumb, source, retryCount + 1);
      }
      
      throw new APIError('network_error', 'Upload failed');
    }
  }

  async getJob(jobId) {
    return this.makeRequest(`/jobs/${jobId}`);
  }

  async updateJob(jobId, updates) {
    return this.makeRequest(`/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async markAction(jobId, applied, type) {
    return this.makeRequest(`/jobs/${jobId}/mark-action`, {
      method: 'POST',
      body: JSON.stringify({ applied, type }),
    });
  }

  async deleteJob(jobId) {
    return this.makeRequest(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  async toggleFavorite(jobId, isFavorite) {
    return this.makeRequest(`/jobs/${jobId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ isFavorite }),
    });
  }

  async getHistory(limit = 50, cursor = null, type = null) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    if (type) params.append('type', type);

    return this.makeRequest(`/history?${params.toString()}`);
  }

  async getStats() {
    return this.makeRequest('/history/stats');
  }

  async checkHealth() {
    return this.makeRequest('/health');
  }
}

class APIError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
  }
}

export { APIError };
export default new APIService();
