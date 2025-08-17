/**
 * Discovr API Configuration
 * 
 * This file contains API endpoint configurations for different environments.
 * Edit this file to switch between cloud API and local proxy API.
 */

module.exports = {
  // Cloud API (original)
  cloudApi: {
    baseUrl: 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1',
    eventsEndpoint: '/venues/events/all'
  },
  
  // Local Proxy API (unlimited events, no HTTP/3 issues)
  localProxyApi: {
    baseUrl: 'http://localhost:3050/api/v1',
    eventsEndpoint: '/venues/events/all'
  },
  
  // *** SET ACTIVE API HERE ***
  // Change this to use either 'cloudApi' or 'localProxyApi'
  activeApi: 'cloudApi'
};
