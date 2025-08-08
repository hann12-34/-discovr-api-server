const axios = require('axios');
const cheerio = require('cheerio');

class NYCInternationalMulticulturalEvents {
    constructor() {
        this.venueName = 'NYC International & Multicultural Events';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.meetup.com';
        this.eventsUrl = 'https://www.meetup.com/find/?keywords=international&location=us--ny--new_york';
        this.category = 'International & Multicultural';
    }

    async scrape() {
        console.log(`🌍 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Find international and multicultural events
            $('h1, h2, h3, h4, .title').each((index, element) => {
                if (index > 40) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const context = $el.parent().text().trim();

                if (title && title.length > 10 && title.length < 120) {
                    if (context.match(/\b(international|multicultural|cultural|global|ethnic|immigrant|diversity|language|foreign|embassy|consulate|diaspora)\b/i)) {
                        events.push({
                            title: title,
                            venue: this.venueName,
                            location: this.venueLocation,
                            date: 'Check website for dates',
                            category: this.category,
                            description: '',
                            link: this.eventsUrl,
                            source: 'NYCInternationalMulticultural'
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

module.exports = NYCInternationalMulticulturalEvents;


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new NYCInternationalMulticulturalEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCInternationalMulticulturalEvents = NYCInternationalMulticulturalEvents;