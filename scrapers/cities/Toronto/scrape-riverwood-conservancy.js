const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Riverwood Conservancy Toronto Events Scraper
 * URL: https://theriverwoodconservancy.org/events/
 */
class RiverwoodConservancyEvents {
    constructor() {
        this.baseUrl = 'https://theriverwoodconservancy.org';
        this.eventsUrl = 'https://theriverwoodconservancy.org/events/';
        this.source = 'Riverwood Conservancy';
        this.city = 'Toronto';
        this.province = 'ON';
    }

    getDefaultCoordinates() {
        return { latitude: 43.6532, longitude: -79.3832 };
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            
            // Try ISO format first
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) return new Date(isoMatch[1]);
            
            // Try parsing various date formats
            const dateRegex = /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4})\b/gi;
            const match = cleanDateStr.match(dateRegex);
            
            if (match) {
                const parsedDate = new Date(match[0]);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate;
                }
            }
            
            // Try current year if no year specified
            const currentYear = new Date().getFullYear();
            const withYear = `${cleanDateStr}, ${currentYear}`;
            const fallbackDate = new Date(withYear);
            
            return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
        } catch (error) {
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    }

    extractVenueInfo() {
        return {
            name: 'Riverwood Conservancy',
            address: '4300 Riverwood Park Lane, Mississauga, ON L5C 2S7',
            city: 'Mississauga',
            province: 'ON',
            coordinates: this.getDefaultCoordinates()
        };
    }

    isLiveEvent(eventDate) {
        if (!eventDate) return false;
        const now = new Date();
        // Only include events that are today or in the future
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return eventDate >= today;
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        // Extract title
        const title = this.cleanText(
            $event.find('h3 a, .event-title a, a').first().text() ||
            $event.find('h1, h2, h3, h4, .title').first().text() ||
            $event.text().split('\n')[0]
        );
        
        if (!title || title.length < 3) return null;
        
        // Extract date
        const dateText = $event.find('.event-date, .tribe-event-date-start, .date').first().text() ||
                        $event.text().match(/([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4})/)?.[1] || '';
        
        const eventDate = this.parseDate(dateText);
        
        // Only include live/future events
        if (!this.isLiveEvent(eventDate)) {
            return null;
        }
        
        const description = this.cleanText(
            $event.find('.event-description, .tribe-events-list-event-description, p').first().text()
        );
        
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? 
            (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        const venue = this.extractVenueInfo();
        
        let category = 'Outdoor & Nature';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('workshop') || titleLower.includes('educational')) {
            category = 'Educational';
        } else if (titleLower.includes('hike') || titleLower.includes('walk')) {
            category = 'Recreation';
        }
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Riverwood Conservancy`,
            date: eventDate,
            venue: venue,
            city: this.city,
            province: this.province,
            price: 'Free',
            category: category,
            source: this.source,
            url: fullEventUrl,
            scrapedAt: new Date()
        };
    }

    async scrapeEvents() {
        console.log(`🔍 Scraping ${this.source} events...`);
        
        try {
            const response = await axios.get(this.eventsUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EventScraper/1.0)'
                }
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Try multiple selectors to find events
            const eventSelectors = [
                '.event-item',
                '.tribe-event',
                '.event',
                '.upcoming-event',
                'article',
                '.post',
                'h3 a[href*="event"]',
                'h2 a[href*="event"]'
            ];
            
            for (const selector of eventSelectors) {
                const eventElements = $(selector);
                if (eventElements.length > 0) {
                    console.log(`📅 Found ${eventElements.length} potential events with selector: ${selector}`);
                    
                    eventElements.each((index, element) => {
                        const eventData = this.extractEventDetails($, element);
                        if (eventData) {
                            events.push(eventData);
                        }
                    });
                    
                    if (events.length > 0) break;
                }
            }
            
            console.log(`✅ Successfully scraped ${events.length} live events from ${this.source}`);
            return events;
            
        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}

module.exports = RiverwoodConservancyEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new RiverwoodConservancyEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('RIVERWOOD CONSERVANCY EVENTS TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);
        
        events.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDateString() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        });
    }
    
    testScraper();
}
