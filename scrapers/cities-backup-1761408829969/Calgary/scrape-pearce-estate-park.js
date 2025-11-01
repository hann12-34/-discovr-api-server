const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class PearceEstateParkScraper {
    constructor() {
        this.source = 'Pearce Estate Park';
        this.baseUrl = 'https://pearceestatepark.com';
        this.eventsUrl = 'https://pearceestatepark.com/events';
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
  const scraper = new PearceEstateParkScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

