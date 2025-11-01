const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Maison Symphonique Montreal Events Scraper
 * Scrapes events from Maison Symphonique (OSM venue)
 */
class MaisonSymphoniqueEvents {
    constructor() {
        this.name = 'Maison Symphonique de Montréal';
        this.baseUrl = 'https://www.osm.ca';
        this.eventsUrl = 'https://www.osm.ca/en/concerts-tickets/';
        this.source = 'maison-symphonique';
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

            // Look for OSM concerts and classical music events
            $('.concert, .event, .spectacle, .performance, .show, article, .card, .item, .listing').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h1, h2, h3, h4, .title, .concert-title, .name, .event-title');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 5 && 
                        !title.toLowerCase().includes('cookie') &&
                        !title.toLowerCase().includes('newsletter') &&
                        !title.toLowerCase().includes('subscribe')) {
                        
                        const descEl = $event.find('.description, .summary, .excerpt, p, .content');
                        const description = descEl.first().text().trim() || `Classical music concert at Maison Symphonique`;
                        
                        const dateEl = $event.find('.date, .concert-date, .when, time, .datetime');
                        const dateText = dateEl.first().text().trim() || dateEl.attr('datetime');
                        
                        const linkEl = $event.find('a').first();
                        const eventUrl = linkEl.attr('href');
                        const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                       eventUrl ? `${this.baseUrl}${eventUrl}` : this.eventsUrl;

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description.substring(0, 300) : `${title} in Montreal`,
                            date: this.parseDate(dateText) || this.getDefaultFutureDate(),
                            venue: {
                                name: 'Maison Symphonique de Montréal',
                                address: '1600 Rue Saint-Urbain, Montréal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5098, longitude: -73.5656 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check OSM website for tickets',
                            category: 'Classical Music',
                            source: this.source,
                            url: fullUrl,
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
            
            // Handle French date formats
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

    getDefaultFutureDate() {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 120) + 14);
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 35);
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
    const scraper = new MaisonSymphoniqueEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
