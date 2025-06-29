/**
 * Static API Routes
 * 
 * These routes provide basic API functionality even when MongoDB is not connected
 */

const express = require('express');
const router = express.Router();

// Basic health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Discovr API',
    endpoints: {
      static: '/api/v1/static',
      venues: '/api/v1/venues',
      events: '/api/v1/events'
    }
  });
});

// Static venues data for when MongoDB is unavailable
router.get('/venues', (req, res) => {
  const staticVenues = [
    {
      id: 'kootenay-gallery',
      name: 'Kootenay Gallery of Art',
      location: {
        address: '120 Heritage Way, Castlegar, BC V1N 4M5',
        city: 'Castlegar',
        postalCode: 'V1N 4M5'
      },
      url: 'https://www.kootenaygallery.com'
    },
    {
      id: 'vancouver-art-gallery',
      name: 'Vancouver Art Gallery',
      location: {
        address: '750 Hornby St, Vancouver, BC V6Z 2H7',
        city: 'Vancouver',
        postalCode: 'V6Z 2H7'
      },
      url: 'https://www.vanartgallery.bc.ca'
    },
    {
      id: 'surrey-art-gallery',
      name: 'Surrey Art Gallery',
      location: {
        address: '13750 88 Ave, Surrey, BC V3W 3L1',
        city: 'Surrey',
        postalCode: 'V3W 3L1'
      },
      url: 'https://www.surrey.ca/arts-culture/surrey-art-gallery'
    }
  ];
  
  res.json({
    status: 'ok',
    message: 'Static venues data (MongoDB not connected)',
    count: staticVenues.length,
    venues: staticVenues
  });
});

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Discovr API',
    version: '1.0.0',
    description: 'API for art gallery and event discovery',
    endpoints: [
      {
        path: '/api/v1/health',
        description: 'API health status'
      },
      {
        path: '/api/v1/static/venues',
        description: 'Static venues list'
      }
    ],
    status: 'operational'
  });
});

module.exports = router;
