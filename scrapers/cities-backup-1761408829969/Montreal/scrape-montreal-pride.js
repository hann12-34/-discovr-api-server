const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class MontrealPrideEvents {
    constructor() {
        this.name = 'Fierté Montréal Pride Festival';
        this.eventsUrl = 'https://www.fierte.montreal/';
        this.source = 'montreal-pride';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🏳️‍🌈 Scraping events from ${this.source}...`);
            const events = [];

            // No hardcoded festival events - only extract real events from website
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);

            $('.event, .event-item, .event-card, .show, .party, .listing, .card, article').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                    const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                    const eventDate = this.parseDate(dateText);
                    
                    // Only add events with valid dates - no fallback dates
                    if (eventDate && this.isEventLive(eventDate)) {
                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} - ${title} at Fierté Montréal Pride Festival`,
                            date: eventDate,
                            venue: {
                                name: 'Gay Village',
                                address: 'Rue Sainte-Catherine Est, Montreal, QC',
                                city: this.city,
                                province: this.province,
                                latitude: 45.5225,
                                longitude: -73.5537
                            },
                            city: this.city,
                            province: this.province,
                            category: 'Pride Event',
                            source: this.source,
                            scrapedAt: new Date()
                        };
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`Error extracting event ${index + 1}:`, error.message);
                }
            });

            console.log(`🎉 Successfully scraped ${events.length} events from ${this.source}`);
            return filterEvents(events);

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            return new Date(dateStr);
        } catch (error) {
            return null;
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
  const scraper = new MontrealPrideEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;



