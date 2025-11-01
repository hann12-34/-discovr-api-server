const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class AtticBarStageScraper {
    constructor() {
        this.source = 'Attic Bar Stage';
        this.baseUrl = 'https://attic-bar-stage.com';
        this.eventsUrl = 'https://attic-bar-stage.com/events';
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
  const scraper = new AtticBarStageScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

