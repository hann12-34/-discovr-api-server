const axios = require('axios');
const cheerio = require('cheerio');

class NYCScienceTechnologyEvents {
    constructor() {
        this.venueName = 'NYC Science & Technology Events';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.meetup.com';
        this.eventsUrl = 'https://www.meetup.com/find/?keywords=tech&location=us--ny--new_york';
        this.category = 'Science & Technology';
    }

    async scrape() {
        console.log(`🔬 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Find science and technology events
            $('h1, h2, h3, h4, .title').each((index, element) => {
                if (index > 40) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const context = $el.parent().text().trim();

                if (title && title.length > 10 && title.length < 120) {
                    if (context.match(/\b(tech|technology|science|programming|coding|software|AI|data|digital|innovation|research|development|engineering)\b/i)) {
                        events.push({
                            title: title,
                            venue: this.venueName,
                            location: this.venueLocation,
                            date: 'Check website for dates',
                            category: this.category,
                            description: '',
                            link: this.eventsUrl,
                            source: 'NYCScienceTechnology'
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

module.exports = NYCScienceTechnologyEvents;


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new NYCScienceTechnologyEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCScienceTechnologyEvents = NYCScienceTechnologyEvents;