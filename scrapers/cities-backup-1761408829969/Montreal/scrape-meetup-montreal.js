const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Meetup Montreal Events Scraper
 * Scrapes Montreal meetup events from meetup.com
 */
class MeetupMontrealEvents {
    constructor() {
        this.name = 'Meetup Montreal';
        this.baseUrl = 'https://www.meetup.com';
        this.eventsUrl = 'https://www.meetup.com/find/events/?allMeetups=false&radius=25&userFreeform=Montreal%2C+QC&mcId=c1008692&mcName=Montreal%2C+QC&eventFilter=all';
        this.source = 'meetup-montreal';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`👥 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract events from Meetup's Montreal page
            $('.event-card, .eventCard, [data-testid="event-card"], .search-result, .event-item, .eventListItem, .card--event').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h3, h4, .eventCard-title, [data-testid="event-name"], .event-title, .text--bold, a[data-event-label="event"]');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 3 && !title.toLowerCase().includes('cookie')) {
                        const descEl = $event.find('.event-description, .eventCard-description, .text--small, .event-meta');
                        const description = descEl.first().text().trim() || `Meetup event in Montreal`;
                        
                        const dateEl = $event.find('.eventTimeDisplay, time, .event-time, [datetime], .eventCard-time');
                        const dateText = dateEl.first().text().trim() || dateEl.attr('datetime');
                        
                        const linkEl = $event.find('a').first();
                        const eventUrl = linkEl.attr('href');
                        const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                       eventUrl ? `${this.baseUrl}${eventUrl}` : this.eventsUrl;
                        
                        const venueEl = $event.find('.venueDisplay, .event-venue, .eventCard-address, .venue-name');
                        const venueName = venueEl.first().text().trim() || 'Montreal Meetup Venue';

                        const groupEl = $event.find('.groupCard-title, .event-group, .groupName');
                        const groupName = groupEl.first().text().trim();

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
                            price: 'Check Meetup for details',
                            category: groupName || 'Meetup',
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

            // Also look for general event-like content with Montreal keywords
            $('*').filter(function() {
                const text = $(this).text().toLowerCase();
                return text.includes('montreal') && 
                       (text.includes('meetup') || text.includes('event') || text.includes('group')) &&
                       text.length > 20 && text.length < 150;
            }).slice(0, 8).each((index, element) => {
                try {
                    const text = $(element).text().trim();
                    if (text && !events.some(e => e.name.toLowerCase().includes(text.toLowerCase().substring(0, 20)))) {
                        const eventData = {
                            id: uuidv4(),
                            name: text.substring(0, 60),
                            title: text.substring(0, 60),
                            description: description && description.length > 20 ? description : `${title} - Montreal meetup event`,
                            date: this.getDefaultFutureDate(),
                            venue: {
                                name: 'Montreal Meetup Venue',
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Free or check meetup for details',
                            category: 'Meetup',
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
        date.setDate(date.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days from now
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 30);
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
    const scraper = new MeetupMontrealEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
