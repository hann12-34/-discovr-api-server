const axios = require('axios');
const cheerio = require('cheerio');

class LincolnCenterEvents {
    constructor() {
        this.venueName = 'Lincoln Center';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.meetup.com';
        this.eventsUrl = 'https://www.meetup.com/find/?keywords=lincoln%20center&location=us--ny--new_york';
        this.category = 'Music';
        // 🚨 CRITICAL: City filtering requirements from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
        this.expectedCity = 'New York';
        this.cityConfig = {
            city: 'New York',
            state: 'NY', 
            country: 'USA',
            fullLocation: 'New York, NY'
        };
    }

    async scrape(city = 'New York') {
        console.log(`🎭 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Find Lincoln Center related events
            $('h1, h2, h3, h4, .title').each((index, element) => {
                if (index > 40) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const context = $el.parent().text().trim();

                if (title && title.length > 10 && title.length < 120) {
                    if (context.match(/\b(lincoln center|metropolitan opera|philharmonic|jazz|ballet|chamber|symphony|classical|performance|concert)\b/i)) {
                        events.push({
                            id: `lincoln-center-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                            title: title,
                            startDate: new Date('2025-12-31T19:00:00'), // Placeholder date
                            endDate: new Date('2025-12-31T21:00:00'),
                            description: `${title} at Lincoln Center`,
                            category: this.category,
                            subcategory: 'Performance',
                            venue: {
                                name: city,
                                venue: this.venueName,
                                address: 'Lincoln Center, New York, NY 10023',
                                city: city,
                                state: 'NY',
                                country: 'USA'
                            },
                            sourceUrl: this.eventsUrl,
                            source: 'Lincoln Center-' + this.cityConfig.city,
                            sourceId: `lincoln-center-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                            lastUpdated: new Date(),
                            tags: ['lincoln-center', 'performance', 'music', 'new-york']
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

module.exports = LincolnCenterEvents;


// Function export for compatibility with runner/validator

