const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class DickensPubScraper {
    constructor() {
        this.source = 'Dickens Pub';
        this.baseUrl = 'https://dickens-pub.com';
        this.eventsUrl = 'https://dickens-pub.com/events';
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
  const scraper = new DickensPubScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

