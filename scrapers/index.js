/**
 * Scraper Coordinator for Discovr
 * Orchestrates all scrapers, aggregates, deduplicates, and saves events to MongoDB
 */

const mongoose = require('mongoose');
const cron = require('node-cron');
const config = require('./config/config');
const deduplication = require('./utils/deduplication');

// Import all scrapers
const eventbriteScraper = require('./sources/eventbrite');
const meetupScraper = require('./sources/meetup');
const localVenuesScraper = require('./sources/localVenues');
const tourismBoardScraper = require('./sources/tourismBoard');

// Import city scrapers
const cityScraper = require('./cities');

// MongoDB Event model (imported from server.js to ensure schema consistency)
let Event;

class ScraperCoordinator {
  constructor() {
    this.config = config;
    this.isRunning = false;
    this.scheduledJobs = [];
    this.scrapers = [
      eventbriteScraper,
      meetupScraper,
      localVenuesScraper,
      tourismBoardScraper,
      cityScraper
    ];
  }

  /**
   * Initialize the scraper coordinator
   * @param {Object} options - Initialization options
   * @param {mongoose.Model} options.eventModel - Mongoose Event model
   * @param {Boolean} options.autoSchedule - Whether to automatically schedule scraper runs
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    try {
      console.log('Initializing Scraper Coordinator...');
      
      // Save the Event model
      Event = options.eventModel;
      
      // Ensure MongoDB is connected
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection not established');
      }
      
      // Auto-schedule scraper if requested
      if (options.autoSchedule) {
        this.scheduleScrapers();
      }
      
      console.log('Scraper Coordinator initialized successfully');
    } catch (error) {
      console.error('Error initializing Scraper Coordinator:', error);
      throw error;
    }
  }

  /**
   * Run all scrapers, aggregate, and save events
   * @param {Object} options - Run options
   * @returns {Promise<Array>} - Array of saved events
   */
  async runScrapers(options = {}) {
    if (this.isRunning) {
      console.log('Scraper run already in progress, skipping');
      return [];
    }
    
    try {
      this.isRunning = true;
      console.log('Starting scraper run...');
      
      // Run all enabled scrapers in parallel
      const scraperPromises = this.scrapers.map(scraper => scraper.scrape(options));
      const results = await Promise.allSettled(scraperPromises);
      
      // Aggregate events from successful scrapers
      const allEvents = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          console.log(`${this.scrapers[index].sourceIdentifier} returned ${result.value.length} events`);
          allEvents.push(...result.value);
        } else {
          console.error(`${this.scrapers[index].sourceIdentifier} scraper failed:`, 
            result.reason ? result.reason.message : 'Unknown error');
        }
      });
      
      console.log(`Total events before deduplication: ${allEvents.length}`);
      
      // Deduplicate events
      const deduplicatedEvents = await deduplication.deduplicateEvents(allEvents);
      
      console.log(`Events after deduplication: ${deduplicatedEvents.length}`);
      
      // Save to MongoDB
      const savedEvents = await this.saveEventsToMongoDB(deduplicatedEvents);
      
      console.log(`Scraper run complete. Saved ${savedEvents.length} events to MongoDB`);
      
      return savedEvents;
    } catch (error) {
      console.error('Error running scrapers:', error);
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Save events to MongoDB
   * @param {Array} events - Events to save
   * @returns {Promise<Array>} - Array of saved events
   */
  async saveEventsToMongoDB(events) {
    if (!events || events.length === 0) {
      return [];
    }
    
    try {
      if (!Event) {
        throw new Error('Event model not initialized');
      }
      
      const savedEvents = [];
      
      // Process each event
      for (const event of events) {
        try {
          // Check if event with this ID already exists
          const existingEvent = await Event.findOne({ id: event.id });
          
          if (existingEvent) {
            // Update existing event
            const updated = await Event.findOneAndUpdate(
              { id: event.id },
              { ...event, lastUpdated: new Date() },
              { new: true }
            );
            savedEvents.push(updated);
          } else {
            // Create new event
            const newEvent = new Event(event);
            await newEvent.save();
            savedEvents.push(newEvent);
          }
        } catch (eventError) {
          console.error(`Error processing event ${event.id}:`, eventError);
        }
      }
      
      return savedEvents;
    } catch (error) {
      console.error('Error saving events to MongoDB:', error);
      return [];
    }
  }

  /**
   * Schedule regular scraper runs using cron
   * @returns {void}
   */
  scheduleScrapers() {
    // Cancel existing scheduled jobs if any
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];
    
    // Schedule regular runs based on config
    if (this.config.scheduler.enabled) {
      console.log(`Scheduling scrapers to run with cron pattern: ${this.config.scheduler.cronPattern}`);
      
      const job = cron.schedule(this.config.scheduler.cronPattern, () => {
        console.log(`Running scheduled scraper at ${new Date()}`);
        this.runScrapers().catch(error => {
          console.error('Error in scheduled scraper run:', error);
        });
      });
      
      this.scheduledJobs.push(job);
    }
  }

  /**
   * Stop all scheduled scraper jobs
   * @returns {void}
   */
  stopScheduledJobs() {
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];
    console.log('All scheduled scraper jobs stopped');
  }
}

module.exports = new ScraperCoordinator();
