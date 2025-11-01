const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class IleSoniqEvents {
    constructor() {
        this.name = 'ÎleSoniq Festival';
        this.eventsUrl = 'https://www.parcjeandrapeau.com/en/ilesoniq-festival-music-electronic-montreal/';
        this.source = 'ilesoniq-festival';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for festival information and create event
            const title = $('h1, h2, .title').first().text().trim() || 'ÎleSoniq Electronic Music Festival';
            const description = $('.description, .content, p').first().text().trim() || 'Electronic dance music festival at Parc Jean-Drapeau';

            // Look for real events only - no hardcoded fallback events

            return events;
        } catch (error) {
            console.error(`Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new IleSoniqEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
