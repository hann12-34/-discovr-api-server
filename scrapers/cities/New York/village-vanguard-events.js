const axios = require('axios');
const cheerio = require('cheerio');

class VillageVanguardEvents {
    constructor() {
        this.venueName = 'Village Vanguard';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.villagevanguard.com';
        this.eventsUrl = 'https://www.villagevanguard.com/calendar';
        this.category = 'Jazz & Live Music';
    }

    async scrape() {
        console.log(`🎺 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Find jazz events
            $('h1, h2, h3, h4').each((index, element) => {
                if (index > 30) return false;
                const $el = $(element);
                const title = $el.text().trim();

                if (title && title.length > 10 && title.length < 100) {
                    const context = $el.parent().text();
                    if (context.match(/\b(jazz|vanguard|music|concert|show|performance|artist|musician)\b/i)) {
                        events.push({
                            title: title,
                            venue: this.venueName,
                            location: this.venueLocation,
                            date: 'Check website for showtimes',
                            category: this.category,
                            description: '',
                            link: this.eventsUrl,
                            source: 'VillageVanguard'
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
  const scraper = new VillageVanguardEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.VillageVanguardEvents = VillageVanguardEvents;