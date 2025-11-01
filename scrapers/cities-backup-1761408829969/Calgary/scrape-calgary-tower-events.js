const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class CalgaryTowerEventsScraper {
    constructor() {
        this.source = 'Calgary Tower Events';
        this.baseUrl = 'https://calgary-tower-events.com';
        this.eventsUrl = 'https://calgary-tower-events.com/events';
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
  const scraper = new CalgaryTowerEventsScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

