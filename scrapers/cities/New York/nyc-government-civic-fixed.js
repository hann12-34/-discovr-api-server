const axios = require('axios');
const cheerio = require('cheerio');

class NYCGovernmentCivicEvents {
    constructor() {
        this.venueName = 'NYC Government & Civic Events';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.meetup.com';
        this.eventsUrl = 'https://www.meetup.com/find/?keywords=government&location=us--ny--new_york';
        this.category = 'Government & Civic';
        // 🚨 CRITICAL: City filtering requirements from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
        this.expectedCity = 'New York';
        this.cityConfig = {
            city: 'New York',
            state: 'NY', 
            country: 'USA',
            fullLocation: 'New York, NY'
        };
    }

    async scrape() {
        console.log(`🏛️ Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Find government and civic events
            $('h1, h2, h3, h4, .title').each((index, element) => {
                if (index > 40) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const context = $el.parent().text().trim();

                if (title && title.length > 10 && title.length < 120) {
                    if (context.match(/\b(government|civic|politics|policy|community|public|city|mayor|council|democracy|voting|citizen|advocacy)\b/i)) {
                        events.push({
                            title: title,
                            venue: {
                                name: this.venueName,
                                address: this.cityConfig.fullLocation,
                                city: this.cityConfig.city,
                                state: this.cityConfig.state,
                                country: this.cityConfig.country
                            },
                            location: this.cityConfig.fullLocation,
                            city: this.cityConfig.city,
                            date: 'Check website for dates',
                            category: this.category,
                            description: '',
                            link: this.eventsUrl,
                            source: 'NYCGovernmentCivic-' + this.cityConfig.city
                        });
                    }
                }
            });

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

module.exports = NYCGovernmentCivicEvents;


// Function export for compatibility with runner/validator

