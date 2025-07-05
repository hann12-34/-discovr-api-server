/**
 * Configuration file for Discovr API scrapers
 * Contains settings, API keys, and configuration options for all scrapers
 */

// Load environment variables
require('dotenv').config();

// Base configuration object
const config = {
  // MongoDB connection
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://materaccount:materaccount123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
    options: {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    }
  },
  
  // Scraper settings
  scrapers: {
    // Enable/disable individual scrapers
    enabled: {
      eventbrite: true,
      meetup: true, 
      localVenues: true,
      tourismBoard: true
    },
    
    // Common settings for all scrapers
    common: {
      timeout: 30000, // HTTP timeout in ms
      retries: 3,     // Number of retries on failure
      concurrentRequests: 5, // Max concurrent requests per scraper
    },
    
    // Eventbrite specific settings
    eventbrite: {
      apiKey: process.env.EVENTBRITE_API_KEY || '',
      baseUrl: 'https://www.eventbriteapi.com/v3/',
      locationRadius: '50mi', // search radius
      categories: ['103', '101', '110', '113'], // Music, Business, Food & Drink, Community
      maxEvents: 100
    },
    
    // Meetup specific settings
    meetup: {
      apiKey: process.env.MEETUP_API_KEY || '',
      baseUrl: 'https://api.meetup.com/find/upcoming_events',
      categories: ['tech', 'art', 'music', 'food-drink', 'sports-fitness'],
      radius: 50, // search radius in miles
      maxEvents: 100
    },
    
    // Local venues scraper settings
    localVenues: {
      urls: [
        'https://www.straight.com/listings/events',
        'https://www.timeout.com/vancouver/things-to-do'
      ],
      maxEventsPerSource: 50
    },
    
    // Tourism board scraper settings
    tourismBoard: {
      urls: [
        'https://www.tourismvancouver.com/events',
        'https://keepexploring.canada.travel/events'
      ],
      maxEventsPerSource: 50
    }
  },
  
  // Scheduler settings
  scheduler: {
    enabled: true,
    // Cron expression for daily run at 2 AM
    cronSchedule: '0 2 * * *',
    // Alternative schedules for testing
    testSchedules: {
      everyMinute: '* * * * *',
      every12Hours: '0 */12 * * *'
    }
  },
  
  // Logger settings
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    path: process.env.LOG_PATH || './logs'
  },
  
  // Deduplication settings
  deduplication: {
    // Fields to use for determining if events are duplicates
    matchFields: ['title', 'startDate', 'venue.name'],
    // Fields to merge from multiple sources (take the non-empty)
    mergeFields: ['description', 'image', 'endDate', 'officialWebsite']
  }
};

module.exports = config;
