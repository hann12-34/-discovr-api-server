const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class Uptown17Scraper {
    constructor() {
        this.source = 'Uptown 17';
        this.baseUrl = 'https://uptown-17.com';
        this.eventsUrl = 'https://uptown-17.com/events';
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
  const scraper = new Uptown17Scraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

