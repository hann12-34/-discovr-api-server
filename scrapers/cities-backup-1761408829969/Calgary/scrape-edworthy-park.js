const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class EdworthyParkScraper {
    constructor() {
        this.source = 'Edworthy Park';
        this.baseUrl = 'https://edworthy-park.com';
        this.eventsUrl = 'https://edworthy-park.com/events';
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
  const scraper = new EdworthyParkScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

