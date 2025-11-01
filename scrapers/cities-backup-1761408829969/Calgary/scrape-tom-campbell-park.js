const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class TomCampbellParkScraper {
    constructor() {
        this.source = 'Tom Campbell Park';
        this.baseUrl = 'https://tomcampbellpark.com';
        this.eventsUrl = 'https://tomcampbellpark.com/events';
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
  const scraper = new TomCampbellParkScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

