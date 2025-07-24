const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * CN Tower Events Scraper
 * Scrapes events from CN Tower Toronto
 * URL: https://www.cntower.ca
 */
class CNTowerEvents {
    constructor() {
        this.baseUrl = 'https://www.cntower.ca';
        this.eventsUrl = 'https://www.cntower.ca/events';
        this.source = 'CN Tower';
        this.city = 'Toronto';
        this.province = 'ON';
    }

    /**
     * Get default coordinates for CN Tower
     * @returns {Object} Default coordinates
     */
    getDefaultCoordinates() {
        return {
            latitude: 43.6426,
            longitude: -79.3871
        };
    }

    /**
     * Parse date from various formats
     * @param {string} dateStr - Date string to parse
     * @returns {Date} Parsed date
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            const cleanDateStr = dateStr.trim();
            
            // Handle ISO date format
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return new Date(isoMatch[1]);
            }
            
            // Handle common date formats
            const dateMatch = cleanDateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
            if (dateMatch) {
                return new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`);
            }
            
            // Handle numeric date formats
            const numericMatch = cleanDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (numericMatch) {
                return new Date(`${numericMatch[1]}/${numericMatch[2]}/${numericMatch[3]}`);
            }
            
            // Try direct parsing
            const parsed = new Date(cleanDateStr);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
            
            return null;
        } catch (error) {
            console.log(`Error parsing date: ${dateStr}`, error);
            return null;
        }
    }

    /**
     * Clean text by removing extra whitespace and HTML entities
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        if (!text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Extract venue information from the page
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {CheerioElement} eventElement - Event element
     * @returns {Object} Venue information
     */
    extractVenueInfo($, eventElement) {
        const defaultCoords = this.getDefaultCoordinates();
        
        return {
            name: 'CN Tower',
            address: '290 Bremner Blvd, Toronto, ON M5V 3L9',
            city: this.city,
            province: this.province,
            latitude: defaultCoords.latitude,
            longitude: defaultCoords.longitude
        };
    }

    /**
     * Extract event details from a single event element
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {CheerioElement} eventElement - Event element
     * @returns {Object} Event details
     */
    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        // Extract title
        const title = this.cleanText(
            $event.find('.title, .event-title, .show-title, .attraction-title, h1, h2, h3, h4, a[href*="event"]').first().text()
        );
        
        if (!title) return null;
        
        // Extract date
        const dateText = $event.find('.date, .when, .time, .event-date, .show-date').first().text();
        const eventDate = this.parseDate(dateText);
        
        // Extract description
        const description = this.cleanText(
            $event.find('.description, .summary, .excerpt, .content, p, .event-description').first().text()
        );
        
        // Extract price
        const priceText = $event.find('.price, .cost, .ticket-price, .admission, .fee').text();
        const price = priceText ? this.cleanText(priceText) : 'Check website for pricing';
        
        // Extract event URL
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        // Extract image
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        // Get venue info
        const venue = this.extractVenueInfo($, eventElement);
        
        // Determine category based on title/description
        let category = 'Attraction';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('observation')) {
            category = 'Observation';
        } else if (titleLower.includes('dining')) {
            category = 'Dining';
        } else if (titleLower.includes('restaurant')) {
            category = 'Restaurant';
        } else if (titleLower.includes('360')) {
            category = 'Restaurant';
        } else if (titleLower.includes('edgewalk')) {
            category = 'Adventure';
        } else if (titleLower.includes('glass')) {
            category = 'Glass Floor';
        } else if (titleLower.includes('tower')) {
            category = 'Tower Experience';
        } else if (titleLower.includes('deck')) {
            category = 'Observation Deck';
        } else if (titleLower.includes('event')) {
            category = 'Special Event';
        } else if (titleLower.includes('concert')) {
            category = 'Concert';
        } else if (titleLower.includes('show')) {
            category = 'Show';
        } else if (titleLower.includes('exhibition')) {
            category = 'Exhibition';
        } else if (titleLower.includes('tour')) {
            category = 'Tour';
        } else if (titleLower.includes('light')) {
            category = 'Light Show';
        } else if (titleLower.includes('fireworks')) {
            category = 'Fireworks';
        } else if (titleLower.includes('new year')) {
            category = 'New Year Event';
        } else if (titleLower.includes('canada day')) {
            category = 'Canada Day Event';
        } else if (titleLower.includes('christmas')) {
            category = 'Christmas Event';
        } else if (titleLower.includes('holiday')) {
            category = 'Holiday Event';
        } else if (titleLower.includes('celebration')) {
            category = 'Celebration';
        } else if (titleLower.includes('anniversary')) {
            category = 'Anniversary Event';
        } else if (titleLower.includes('gala')) {
            category = 'Gala';
        } else if (titleLower.includes('fundraiser')) {
            category = 'Fundraiser';
        } else if (titleLower.includes('charity')) {
            category = 'Charity Event';
        } else if (titleLower.includes('private')) {
            category = 'Private Event';
        } else if (titleLower.includes('corporate')) {
            category = 'Corporate Event';
        } else if (titleLower.includes('wedding')) {
            category = 'Wedding';
        } else if (titleLower.includes('meeting')) {
            category = 'Meeting';
        } else if (titleLower.includes('conference')) {
            category = 'Conference';
        } else if (titleLower.includes('workshop')) {
            category = 'Workshop';
        } else if (titleLower.includes('class')) {
            category = 'Class';
        } else if (titleLower.includes('educational')) {
            category = 'Educational Event';
        } else if (titleLower.includes('kids')) {
            category = 'Kids Event';
        } else if (titleLower.includes('family')) {
            category = 'Family Event';
        } else if (titleLower.includes('adult')) {
            category = 'Adult Event';
        } else if (titleLower.includes('senior')) {
            category = 'Senior Event';
        } else if (titleLower.includes('cultural')) {
            category = 'Cultural Event';
        } else if (titleLower.includes('heritage')) {
            category = 'Heritage Event';
        } else if (titleLower.includes('history')) {
            category = 'Historical Event';
        } else if (titleLower.includes('art')) {
            category = 'Art Event';
        } else if (titleLower.includes('music')) {
            category = 'Music Event';
        } else if (titleLower.includes('dance')) {
            category = 'Dance Event';
        } else if (titleLower.includes('performance')) {
            category = 'Performance';
        } else if (titleLower.includes('theatre')) {
            category = 'Theatre';
        } else if (titleLower.includes('comedy')) {
            category = 'Comedy';
        } else if (titleLower.includes('magic')) {
            category = 'Magic Show';
        } else if (titleLower.includes('sport')) {
            category = 'Sports Event';
        } else if (titleLower.includes('fitness')) {
            category = 'Fitness Event';
        } else if (titleLower.includes('health')) {
            category = 'Health Event';
        } else if (titleLower.includes('wellness')) {
            category = 'Wellness Event';
        } else if (titleLower.includes('food')) {
            category = 'Food Event';
        } else if (titleLower.includes('wine')) {
            category = 'Wine Event';
        } else if (titleLower.includes('beer')) {
            category = 'Beer Event';
        } else if (titleLower.includes('cocktail')) {
            category = 'Cocktail Event';
        } else if (titleLower.includes('tasting')) {
            category = 'Tasting Event';
        } else if (titleLower.includes('market')) {
            category = 'Market';
        } else if (titleLower.includes('fair')) {
            category = 'Fair';
        } else if (titleLower.includes('festival')) {
            category = 'Festival';
        } else if (titleLower.includes('parade')) {
            category = 'Parade';
        } else if (titleLower.includes('march')) {
            category = 'March';
        } else if (titleLower.includes('walk')) {
            category = 'Walk';
        } else if (titleLower.includes('run')) {
            category = 'Run';
        } else if (titleLower.includes('bike')) {
            category = 'Bike Event';
        } else if (titleLower.includes('outdoor')) {
            category = 'Outdoor Event';
        } else if (titleLower.includes('nature')) {
            category = 'Nature Event';
        } else if (titleLower.includes('adventure')) {
            category = 'Adventure';
        } else if (titleLower.includes('thrill')) {
            category = 'Thrill Experience';
        } else if (titleLower.includes('extreme')) {
            category = 'Extreme Experience';
        } else if (titleLower.includes('adrenaline')) {
            category = 'Adrenaline Experience';
        }
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at CN Tower`,
            date: eventDate,
            venue: venue,
            city: this.city,
            province: this.province,
            price: price,
            category: category,
            source: this.source,
            url: fullEventUrl,
            image: fullImageUrl,
            scrapedAt: new Date()
        };
    }

    /**
     * Check if event is still live (today or in the future)
     * @param {Date} eventDate - Event date
     * @returns {boolean} True if event is live
     */
    isEventLive(eventDate) {
        if (!eventDate) return true; // Include events with no date
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return eventDate >= today;
    }

    /**
     * Remove duplicate events by title and date
     * @param {Array} events - Array of events
     * @returns {Array} Deduplicated events
     */
    removeDuplicates(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.date ? event.date.toDateString() : 'no-date'}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Main scraping method
     * @returns {Array} Array of events
     */
    async scrapeEvents() {
        try {
            console.log(`🏗️ Scraping events from ${this.source}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Look for common event selectors
            const eventSelectors = [
                '.event',
                '.event-item',
                '.event-card',
                '.attraction',
                '.experience',
                '.tower-event',
                '.cn-tower-event',
                '.listing',
                '.card',
                '.post'
            ];
            
            let eventElements = $();
            for (const selector of eventSelectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    eventElements = elements;
                    console.log(`✅ Found ${elements.length} events using selector: ${selector}`);
                    break;
                }
            }
            
            if (eventElements.length === 0) {
                console.log('⚠️  No events found with standard selectors, trying alternative approach...');
                
                // Try finding events by looking for elements with event-related content
                eventElements = $('[class*="event"], [class*="attraction"], [class*="experience"], [class*="tower"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('event') || text.includes('attraction') || text.includes('experience') || 
                           text.includes('tower') || text.includes('deck') || text.includes('observation') ||
                           text.includes('restaurant') || text.includes('360') || text.includes('edgewalk');
                });
            }
            
            console.log(`📅 Processing ${eventElements.length} potential events...`);
            
            // Process each event
            eventElements.each((index, element) => {
                try {
                    const eventData = this.extractEventDetails($, element);
                    if (eventData && eventData.title && eventData.title.length > 3) {
                        events.push(eventData);
                        console.log(`✅ Extracted: ${eventData.title}`);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });
            
            // Remove duplicates
            const uniqueEvents = this.removeDuplicates(events);
            
            // Filter for live events
            const liveEvents = uniqueEvents.filter(event => this.isEventLive(event.date));
            
            console.log(`🎉 Successfully scraped ${liveEvents.length} unique events from ${this.source}`);
            return liveEvents;
            
        } catch (error) {
            console.error(`❌ Error scraping events from ${this.source}:`, error.message);
            return [];
        }
    }
}

module.exports = CNTowerEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new CNTowerEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('CN TOWER TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);
        
        events.slice(0, 3).forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDateString() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        });
    }
    
    testScraper();
}
