const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class MountRoyalUniversityScraper {
    constructor() {
        this.source = 'Mount Royal University';
        this.baseUrl = 'https://mount-royal-university.com';
        this.eventsUrl = 'https://mount-royal-university.com/events';
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
  const scraper = new MountRoyalUniversityScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

