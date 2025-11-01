const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class CalgaryNightlifeScraper {
    constructor() {
        this.source = 'Calgary Nightlife';
        this.baseUrl = 'https://calgary-nightlife.com';
        this.eventsUrl = 'https://calgary-nightlife.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            return [];
        } catch (error) {
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new CalgaryNightlifeScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

