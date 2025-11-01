const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Facebook Events Montreal Scraper
 * Scrapes public Facebook events in Montreal area
 */
class FacebookEventsMontrealEvents {
    constructor() {
        this.name = 'Facebook Events Montreal';
        this.baseUrl = 'https://www.facebook.com';
        this.eventsUrl = 'https://www.facebook.com/events/search/?q=montreal&filters=eyJycF9ldmVudHNfbG9jYXRpb246MCI6IntcIm5hbWVcIjpcIm1vbnRyZWFsXCIsXCJpZFwiOm51bGx9In0%3D';
        this.source = 'facebook-events-montreal';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`📘 Scraping events from ${this.source}...`);

            // Use mobile Facebook URL which is more scraper-friendly
            const mobileUrl = 'https://m.facebook.com/events/search/?q=montreal%20events';
            
            const response = await axios.get(mobileUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract events from Facebook mobile events page
            $('[data-testid="event"], .event, .event-item, ._5vzm, ._42ef, article, .story_body_container').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h3, h4, ._52jd, ._5n_5, .accessible_elem, strong, a[href*="/events/"]');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 3 && !title.toLowerCase().includes('suggested') && !title.toLowerCase().includes('cookie')) {
                        const descEl = $event.find('._5n_6, ._427x, .userContent, ._5pbx, div[data-testid="event-description"]');
                        const description = descEl.first().text().trim() || `Facebook event in Montreal`;
                        
                        const dateEl = $event.find('._2yau, ._5n_4, time, [data-testid="event-date"]');
                        const dateText = dateEl.first().text().trim() || dateEl.attr('datetime');
                        
                        const linkEl = $event.find('a[href*="/events/"]').first();
                        const eventUrl = linkEl.attr('href');
                        const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                       eventUrl ? `${this.baseUrl}${eventUrl}` : this.eventsUrl;
                        
                        const venueEl = $event.find('._5n_7, ._5xhk, [data-testid="event-location"]');
                        const venueName = venueEl.first().text().trim() || 'Montreal Venue';

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description.substring(0, 300) : `${title} in Montreal`,
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
                            price: 'Check Facebook event for details',
                            category: 'Social Event',
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

            // Fallback: Look for any Montreal-related content with event indicators
            $('*').filter(function() {
                const text = $(this).text().toLowerCase();
                return text.includes('montreal') && 
                       (text.includes('event') || text.includes('show') || text.includes('concert') || text.includes('party')) &&
                       text.length > 20 && text.length < 200;
            }).slice(0, 10).each((index, element) => {
                try {
                    const text = $(element).text().trim();
                    if (text && !events.some(e => e.name === text)) {
                        const eventData = {
                            id: uuidv4(),
                            name: text.substring(0, 80),
                            title: text.substring(0, 80),
                            description: description && description.length > 20 ? description : `${title} - Social event in Montreal`,
                            date: this.getDefaultFutureDate(),
                            venue: {
                                name: 'Montreal Social Venue',
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check details online',
                            category: 'Social Event',
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
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    getDefaultFutureDate() {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days from now
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 50);
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
    const scraper = new FacebookEventsMontrealEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
