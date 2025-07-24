/**
 * HR MacMillan Space Centre Events Scraper (No-Fallback Version)
 * Scrapes events from the HR MacMillan Space Centre in Vancouver
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class SpaceCentreEvents {
  constructor() {
    this.name = 'HR MacMillan Space Centre Events';
    this.url = 'https://www.spacecentre.ca/';
    this.eventsUrl = 'https://www.spacecentre.ca/events/';
    this.exhibitionsUrl = 'https://www.spacecentre.ca/exhibits/';
    this.showsUrl = 'https://www.spacecentre.ca/planetarium-shows/';
    this.sourceIdentifier = 'hr-macmillan-space-centre';
    this.venue = {
      name: 'H.R. MacMillan Space Centre',
      address: '1100 Chestnut Street, Vancouver, BC V6J 3J9',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2765, lng: -123.1444 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'space-centre');
    
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(this.debugDir)) {
      try {
        fs.mkdirSync(this.debugDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create debug directory: ${error.message}`);
      }
    }
  }

  /**
   * Scrape events from the HR MacMillan Space Centre
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`🔍 Scraping ${this.name}...`);
    let browser = null;
    let page = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      });
      
      page = await browser.newPage();
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
      
      // Set extra HTTP headers to appear more like a regular browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // Set up request interception to block unnecessary resources
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      const allEvents = [];
      
      // First check events page
      console.log(`Navigating to events page ${this.eventsUrl}...`);
      await page.goto(this.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this._saveDebugInfo(page, 'events-page');
      
      // Extract events
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      allEvents.push(...events);
      
      // Check shows page
      console.log(`Navigating to planetarium shows page ${this.showsUrl}...`);
      await page.goto(this.showsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this._saveDebugInfo(page, 'shows-page');
      
      // Extract shows as events
      console.log('Extracting planetarium shows...');
      const shows = await this._extractEvents(page, true);
      allEvents.push(...shows);
      
      // Check exhibits page
      console.log(`Navigating to exhibits page ${this.exhibitionsUrl}...`);
      await page.goto(this.exhibitionsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this._saveDebugInfo(page, 'exhibits-page');
      
      // Extract exhibits as events
      console.log('Extracting exhibits...');
      const exhibits = await this._extractEvents(page, false, true);
      allEvents.push(...exhibits);
      
      // Remove duplicates based on title and date
      const uniqueEvents = this._removeDuplicateEvents(allEvents);
      
      // Validate events - strict validation with no fallbacks
      const validEvents = uniqueEvents.filter(event => {
        const isValid = 
          event.title && 
          event.description && 
          event.startDate && 
          event.startDate instanceof Date && 
          !isNaN(event.startDate);
        
        if (!isValid) {
          console.log(`⚠️ Skipping invalid event: ${event.title || 'Unnamed'}`);
        }
        
        return isValid;
      });
      
      console.log(`Found ${validEvents.length} valid events out of ${uniqueEvents.length} unique events`);
      
      if (validEvents.length === 0) {
        console.log('⚠️ No valid events found after filtering. Strict validation removed all events but NO fallbacks will be used.');
      }
      
      console.log(`🪐 Successfully scraped ${validEvents.length} events from ${this.name}`);
      return validEvents;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      
      // Save debug info
      if (page) {
        try {
          await this._saveDebugInfo(page, 'error-scrape');
        } catch (debugError) {
          console.error(`Failed to save debug info: ${debugError.message}`);
        }
      }
      
      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed successfully');
        } catch (closeError) {
          console.error(`Failed to close browser: ${closeError.message}`);
        }
      }
    }
  }
