const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class CarburnParkEventsScraper {
    constructor() {
        this.source = 'Carburn Park Events';
        this.baseUrl = 'https://carburnparkevents.com';
        this.eventsUrl = 'https://carburnparkevents.com/events';
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
  const scraper = new CarburnParkEventsScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

