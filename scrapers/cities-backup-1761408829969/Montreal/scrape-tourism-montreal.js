const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Tourism Montreal Events Scraper
 * Official city tourism events from Montreal's tourism website
 */
class TourismMontrealEvents {
    constructor() {
        this.name = 'Tourism Montreal';
        this.baseUrl = 'https://www.mtl.org';
        this.eventsUrl = 'https://www.mtl.org/en/what-to-do/events';
        this.source = 'tourism-montreal';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🏛️ Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract events from Tourism Montreal's events page
            $('.event, .event-item, .event-card, .activity, .activity-item, article, .card, .listing, [data-event], .wp-block-group, .entry, .post-item, .event-listing, .tourism-event').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .name, .event-name, .activity-title, .headline, .entry-title');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 3 && !title.toLowerCase().includes('cookie')) {
                        const descEl = $event.find('p, .description, .summary, .excerpt, .content, .event-description');
                        const description = descEl.first().text().trim() || `Tourism event in Montreal`;
                        
                        const dateEl = $event.find('.date, .event-date, .when, time, .datetime, .start-date, [datetime], .activity-date');
                        const dateText = dateEl.first().text().trim() || dateEl.attr('datetime');
                        
                        const linkEl = $event.find('a').first();
                        const eventUrl = linkEl.attr('href');
                        const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                       eventUrl ? `${this.baseUrl}${eventUrl}` : this.eventsUrl;
                        
                        const venueEl = $event.find('.venue, .location, .address, .event-venue, .activity-location');
                        const venueName = venueEl.first().text().trim() || 'Montreal';

                        const categoryEl = $event.find('.category, .type, .event-category, .tag');
                        const category = categoryEl.first().text().trim() || 'Tourism & Culture';

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description.substring(0, 300) : `${title} in Montreal`,
                            date: this.parseDate(dateText) || new Date(),
                            venue: {
                                name: venueName || 'Montreal',
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check website for pricing',
                            category: category,
                            source: this.source,
                            url: fullUrl,
                            scrapedAt: new Date()
                        };

                        // Only include future events
                        if (this.isEventLive(eventData.date)) {
                            events.push(eventData);
                        }
                    }
                } catch (err) {
                    // Skip invalid events
                }
            });

            // Also check for festival and cultural events sections
            $('.festival, .cultural-event, .show, .concert, .exhibition').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h1, h2, h3, h4, .title, .name');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 3) {
                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} - Cultural event in Montreal from Tourism Montreal`,
                            date: new Date(),
                            venue: {
                                name: 'Montreal Cultural Venue',
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check website for pricing',
                            category: 'Arts & Culture',
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
            const cleanDateStr = dateStr.trim().replace(/\s+/g, ' ');
            
            // Handle French month names common in Quebec
            const frenchMonths = {
                'janvier': 'January', 'février': 'February', 'mars': 'March',
                'avril': 'April', 'mai': 'May', 'juin': 'June',
                'juillet': 'July', 'août': 'August', 'septembre': 'September',
                'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
            };
            
            let dateString = cleanDateStr.toLowerCase();
            for (const [fr, en] of Object.entries(frenchMonths)) {
                dateString = dateString.replace(fr, en);
            }
            
            const parsedDate = new Date(dateString);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const now = new Date();
        const eventDateTime = new Date(eventDate);
        return eventDateTime >= now;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase()}-${event.date}`;
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
    const scraper = new TourismMontrealEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
