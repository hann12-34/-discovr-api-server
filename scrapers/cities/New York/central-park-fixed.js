const axios = require('axios');
const cheerio = require('cheerio');

class CentralParkEvents {
    constructor() {
        this.venueName = 'Central Park';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://centralpark.org';
        this.eventsUrl = 'https://centralpark.org';
        this.category = 'Park & Outdoor Events';
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
        console.log(`🌳 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Find event-related content
            $('h1, h2, h3, h4').each((index, element) => {
                if (index > 30) return false;
                const $el = $(element);
                const title = $el.text().trim();

                if (title && title.length > 10 && title.length < 100) {
                    const context = $el.parent().text();
                    if (context.match(/\b(park|tour|walk|event|concert|festival|program|activity)\b/i)) {
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
                            source: 'CentralPark-' + this.cityConfig.city
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

module.exports = CentralParkEvents;


// Function export for compatibility with runner/validator

