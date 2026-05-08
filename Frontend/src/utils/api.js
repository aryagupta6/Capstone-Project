import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add API key to requests if available
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('apiKey');
  const apiSecret = localStorage.getItem('apiSecret');
  
  if (apiKey && apiSecret) {
    config.headers['x-api-key'] = apiKey;
    config.headers['x-api-secret'] = apiSecret;
  }
  
  return config;
});

export default api;
