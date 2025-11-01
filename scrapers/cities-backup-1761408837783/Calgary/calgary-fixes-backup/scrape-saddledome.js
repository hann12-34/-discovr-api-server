const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class SaddledomeScraper {
    constructor() {
        this.source = 'Saddledome';
        this.baseUrl = 'https://saddledome.com';
        this.eventsUrl = 'https://saddledome.com/events';
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

module.exports = SaddledomeScraper;
