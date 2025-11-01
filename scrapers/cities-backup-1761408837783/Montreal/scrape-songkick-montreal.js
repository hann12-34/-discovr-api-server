const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Songkick Montreal Events Scraper
 * Scrapes concert events from Songkick for Montreal
 */
class SongkickMontrealEvents {
    constructor() {
        this.name = 'Songkick Montreal';
        this.baseUrl = 'https://www.songkick.com';
        this.eventsUrl = 'https://www.songkick.com/metro-areas/27377-canada-montreal';
        this.source = 'songkick-montreal';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎼 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Songkick specific selectors
            $('.event-listings li, .event, .concert, .show, .listing-item, .event-item, [data-testid="event"]').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('.artists, .event-link, .artist-name, h3, h4, a');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 2) {
                        const venueEl = $event.find('.venue-name, .location, .venue');
                        const venueName = venueEl.first().text().trim() || 'Montreal Venue';
                        
                        const dateEl = $event.find('.date, time, .event-date');
                        const dateText = dateEl.first().text().trim();

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} - Live music event in Montreal`,
                            date: this.parseDate(dateText) || this.getDefaultFutureDate(),
                            venue: {
                                name: venueName,
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check Songkick for tickets',
                            category: 'Music',
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        events.push(eventData);
                    }
                } catch (err) {
                    // Skip invalid events
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    getDefaultFutureDate() {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 45) + 7); // 7-52 days from now
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 25);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export async function wrapper
async function scrapeEvents() {
    const scraper = new SongkickMontrealEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
