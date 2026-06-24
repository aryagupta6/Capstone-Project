import axios from 'axios';

// Create a configured axios client pointing to our versioned API gateway
const api = axios.create({
  baseURL: '/api/v1',
});

// Request Interceptor: Attach security credentials dynamically
api.interceptors.request.use((config) => {
  // 1. Attach JWT bearer session token for dashboard requests
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. Attach API Credentials for programmatic client verification
  const apiKey = localStorage.getItem('apiKey');
  const apiSecret = localStorage.getItem('apiSecret');
  if (apiKey && apiSecret) {
    config.headers['x-api-key'] = apiKey;
    config.headers['x-api-secret'] = apiSecret;
  }
  
  return config;
});

export default api;
