const axios = require('axios');
const cheerio = require('cheerio');

class MercuryLoungeEvents {
    constructor() {
        this.venueName = 'Mercury Lounge';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.mercuryloungenyc.com';
        this.eventsUrl = 'https://www.mercuryloungenyc.com/calendar';
        this.category = 'Live Music & Concerts';
    }

    async scrape() {
        console.log(`🎸 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Find music events
            $('h1, h2, h3, h4, .artist, .event-title').each((index, element) => {
                if (index > 40) return false;
                const $el = $(element);
                const title = $el.text().trim();

                if (title && title.length > 8 && title.length < 100) {
                    const context = $el.parent().text();
                    if (context.match(/\b(mercury|lounge|music|concert|show|performance|artist|band|tour)\b/i)) {
                        events.push({
                            title: title,
                            venue: this.venueName,
                            location: this.venueLocation,
                            date: 'Check website for showtimes',
                            category: this.category,
                            description: '',
                            link: this.eventsUrl,
                            source: 'MercuryLounge'
                        };
                    }
                }
            };

            console.log(`✅ ${this.venueName}: Found ${events.length} events`);
            return events;

        } catch (error) {
            console.log(`❌ Error scraping ${this.venueName}: ${error.message}`);
            return [];
        }
    }

    async fetchEvents() {
        return await this.scrape();
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new MercuryLoungeEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.MercuryLoungeEvents = MercuryLoungeEvents;