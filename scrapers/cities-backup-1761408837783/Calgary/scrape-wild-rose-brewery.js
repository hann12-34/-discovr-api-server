const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class WildRoseBreweryScraper {
    constructor() {
        this.source = 'Wild Rose Brewery';
        this.baseUrl = 'https://wild-rose-brewery.com';
        this.eventsUrl = 'https://wild-rose-brewery.com/events';
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
  const scraper = new WildRoseBreweryScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

