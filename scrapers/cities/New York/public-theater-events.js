const axios = require('axios');
const cheerio = require('cheerio');

class PublicTheaterEvents {
    constructor() {
        this.venueName = 'Public Theater';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://publictheater.org';
        this.eventsUrl = 'https://publictheater.org/productions';
        this.category = 'Theater & Performing Arts';
    }

    async scrape() {
        console.log(`🎭 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Find theater productions and events
            $('h1, h2, h3, h4, .production-title, .event-title').each((index, element) => {
                if (index > 30) return false;
                const $el = $(element);
                const title = $el.text().trim();

                if (title && title.length > 8 && title.length < 120) {
                    const context = $el.parent().text();
                    if (context.match(/\b(theater|theatre|production|play|performance|show|drama|musical)\b/i)) {
                        events.push({
                            title: title,
                            venue: this.venueName,
                            location: this.venueLocation,
                            date: 'Check website for show dates',
                            category: this.category,
                            description: '',
                            link: this.eventsUrl,
                            source: 'PublicTheater'
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
  const scraper = new PublicTheaterEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.PublicTheaterEvents = PublicTheaterEvents;