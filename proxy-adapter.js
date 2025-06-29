/**
 * Discovr Proxy API Adapter
 * 
 * This adapter makes it easy to integrate the proxy API with your app.
 * It provides functions to automatically switch between cloud and proxy endpoints.
 */

const axios = require('axios');
const apiConfig = require('./api-config');

// Get the active API configuration
const getActiveConfig = () => {
  return apiConfig[apiConfig.activeApi];
};

// Create a configured axios instance for the active API
const createApiClient = () => {
  const config = getActiveConfig();
  
  return axios.create({
    baseURL: config.baseUrl,
    timeout: 10000,
    headers: {
      'X-Disable-HTTP3': '1.1',
      'X-Force-HTTP-Version': '1.1'
    }
  });
};

// API functions
const api = {
  // Get all events
  getAllEvents: async () => {
    const client = createApiClient();
    const config = getActiveConfig();
    try {
      const response = await client.get(config.eventsEndpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error.message);
      throw error;
    }
  },
  
  // Check API health
  checkHealth: async () => {
    const client = createApiClient();
    try {
      const response = await client.get('/health');
      return response.data;
    } catch (error) {
      console.error('API health check failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }
};

module.exports = api;
