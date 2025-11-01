const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class PrincesIslandParkScraper {
    constructor() {
        this.source = 'Princes Island Park';
        this.baseUrl = 'https://princes-island-park.com';
        this.eventsUrl = 'https://princes-island-park.com/events';
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
  const scraper = new PrincesIslandParkScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

