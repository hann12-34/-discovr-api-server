const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class EventbriteCalgaryScraper {
    constructor() {
        this.source = 'Eventbrite Calgary';
        this.baseUrl = 'https://eventbrite-calgary.com';
        this.eventsUrl = 'https://eventbrite-calgary.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            console.log(`❌ Eventbrite events are not allowed - returning empty results`);
            return [];
        } catch (error) {
            console.log(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new EventbriteCalgaryScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

