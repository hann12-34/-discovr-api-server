const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class GlobalfestFestivalScraper {
    constructor() {
        this.source = 'Globalfest Festival';
        this.baseUrl = 'https://globalfest-festival.com';
        this.eventsUrl = 'https://globalfest-festival.com/events';
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
  const scraper = new GlobalfestFestivalScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

