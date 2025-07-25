const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * West Village Events Scraper
 * Scrapes events from West Village Calgary
 * URL: https://westvillagecalgary.com
 */
class WestVillageEvents {
    constructor() {
        this.baseUrl = 'https://westvillagecalgary.com';
        this.eventsUrl = 'https://westvillagecalgary.com/events';
        this.source = 'West Village Calgary';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    /**
     * Get default coordinates for West Village
     * @returns {Object} Default coordinates
     */
    getDefaultCoordinates() {
        return {
            latitude: 51.0447,
            longitude: -114.0719
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
        const venueElement = $(eventElement).find('.venue, .location, .where, .place, .community').first();
        const venueName = venueElement.length > 0 ? this.cleanText(venueElement.text()) : null;
        
        const defaultCoords = this.getDefaultCoordinates();
        
        return {
            name: venueName || 'West Village Calgary',
            address: 'Calgary, AB',
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
            $event.find('.title, .event-title, .show-title, .community-event-title, h1, h2, h3, h4, a[href*="event"]').first().text()
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
        let category = 'Community Event';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('market')) {
            category = 'Market';
        } else if (titleLower.includes('festival')) {
            category = 'Festival';
        } else if (titleLower.includes('music')) {
            category = 'Music Event';
        } else if (titleLower.includes('art')) {
            category = 'Art Event';
        } else if (titleLower.includes('food')) {
            category = 'Food Event';
        } else if (titleLower.includes('family')) {
            category = 'Family Event';
        } else if (titleLower.includes('outdoor')) {
            category = 'Outdoor Event';
        } else if (titleLower.includes('fitness')) {
            category = 'Fitness Event';
        } else if (titleLower.includes('workshop')) {
            category = 'Workshop';
        } else if (titleLower.includes('class')) {
            category = 'Class';
        } else if (titleLower.includes('tour')) {
            category = 'Tour';
        } else if (titleLower.includes('walk')) {
            category = 'Walking Event';
        } else if (titleLower.includes('run')) {
            category = 'Running Event';
        } else if (titleLower.includes('bike')) {
            category = 'Cycling Event';
        } else if (titleLower.includes('yoga')) {
            category = 'Yoga';
        } else if (titleLower.includes('wellness')) {
            category = 'Wellness Event';
        } else if (titleLower.includes('health')) {
            category = 'Health Event';
        } else if (titleLower.includes('education')) {
            category = 'Education Event';
        } else if (titleLower.includes('networking')) {
            category = 'Networking Event';
        } else if (titleLower.includes('business')) {
            category = 'Business Event';
        } else if (titleLower.includes('sustainability')) {
            category = 'Sustainability Event';
        } else if (titleLower.includes('environment')) {
            category = 'Environmental Event';
        } else if (titleLower.includes('green')) {
            category = 'Green Event';
        } else if (titleLower.includes('local')) {
            category = 'Local Event';
        } else if (titleLower.includes('neighbour')) {
            category = 'Neighbourhood Event';
        } else if (titleLower.includes('seasonal')) {
            category = 'Seasonal Event';
        } else if (titleLower.includes('holiday')) {
            category = 'Holiday Event';
        } else if (titleLower.includes('celebration')) {
            category = 'Celebration';
        } else if (titleLower.includes('party')) {
            category = 'Party';
        } else if (titleLower.includes('fundraiser')) {
            category = 'Fundraiser';
        } else if (titleLower.includes('charity')) {
            category = 'Charity Event';
        } else if (titleLower.includes('volunteer')) {
            category = 'Volunteer Event';
        } else if (titleLower.includes('cleanup')) {
            category = 'Cleanup Event';
        } else if (titleLower.includes('planting')) {
            category = 'Planting Event';
        } else if (titleLower.includes('garden')) {
            category = 'Garden Event';
        } else if (titleLower.includes('nature')) {
            category = 'Nature Event';
        } else if (titleLower.includes('wildlife')) {
            category = 'Wildlife Event';
        } else if (titleLower.includes('children')) {
            category = 'Children\'s Event';
        } else if (titleLower.includes('youth')) {
            category = 'Youth Event';
        } else if (titleLower.includes('senior')) {
            category = 'Senior Event';
        } else if (titleLower.includes('cultural')) {
            category = 'Cultural Event';
        } else if (titleLower.includes('heritage')) {
            category = 'Heritage Event';
        } else if (titleLower.includes('history')) {
            category = 'Historical Event';
        } else if (titleLower.includes('meeting')) {
            category = 'Meeting';
        } else if (titleLower.includes('information')) {
            category = 'Information Session';
        } else if (titleLower.includes('open house')) {
            category = 'Open House';
        } else if (titleLower.includes('consultation')) {
            category = 'Consultation';
        } else if (titleLower.includes('planning')) {
            category = 'Planning Event';
        } else if (titleLower.includes('development')) {
            category = 'Development Event';
        }
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at West Village Calgary`,
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
            console.log(`🏘️ Scraping events from ${this.source}...`);
            
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
                '.community-event',
                '.village-event',
                '.west-village-event',
                '.listing',
                '.card',
                '.post',
                '.event-listing'
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
                
                // Try finding events by looking for elements with community content
                eventElements = $('[class*="event"], [class*="community"], [class*="village"], [class*="west"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('event') || text.includes('community') || text.includes('village') || 
                           text.includes('west') || text.includes('market') || text.includes('festival') ||
                           text.includes('meeting') || text.includes('workshop') || text.includes('class');
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

module.exports = WestVillageEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new WestVillageEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('WEST VILLAGE CALGARY TEST RESULTS');
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
