const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class PalaceTheatreScraper {
    constructor() {
        this.source = 'Palace Theatre';
        this.baseUrl = 'https://palace-theatre.com';
        this.eventsUrl = 'https://palace-theatre.com/events';
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
  const scraper = new PalaceTheatreScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

