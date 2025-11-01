const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class KensingtonPubScraper {
    constructor() {
        this.source = 'Kensington Pub';
        this.baseUrl = 'https://kensington-pub.com';
        this.eventsUrl = 'https://kensington-pub.com/events';
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
  const scraper = new KensingtonPubScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

