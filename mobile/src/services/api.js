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

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error || 'api_error', data.message || 'Request failed', response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('network_error', 'Network request failed');
    }
  }

  async uploadImage(imageUri, wantThumb = true, source = 'picker') {
    try {
      const userId = await getUserId();
      const language = getCurrentLanguage();

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });
      formData.append('wantThumb', wantThumb.toString());
      formData.append('source', source);

      const response = await fetch(`${this.baseURL}/jobs`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'accept-language': language,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error || 'upload_error', data.message || 'Upload failed', response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('network_error', 'Upload failed');
    }
  }

  async getJob(jobId) {
    return this.makeRequest(`/jobs/${jobId}`);
  }

  async markAction(jobId, applied, type) {
    return this.makeRequest(`/jobs/${jobId}/mark-action`, {
      method: 'POST',
      body: JSON.stringify({ applied, type }),
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
