const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Calgary Farmers Market Events Scraper
 * Scrapes events from Calgary Farmers Market
 * URL: https://www.calgaryfarmersmarket.ca
 */
class CalgaryFarmersMarketEvents {
    constructor() {
        this.baseUrl = 'https://www.calgaryfarmersmarket.ca';
        this.eventsUrl = 'https://www.calgaryfarmersmarket.ca/events-and-activities';
        this.source = 'Calgary Farmers Market';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    /**
     * Get default coordinates for Calgary Farmers Market
     * @returns {Object} Default coordinates
     */
    getDefaultCoordinates() {
        return {
            latitude: 51.0242,
            longitude: -114.0718
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
        const venueElement = $(eventElement).find('.venue, .location, .where, .place, .market, .stall').first();
        const venueName = venueElement.length > 0 ? this.cleanText(venueElement.text()) : null;
        
        const defaultCoords = this.getDefaultCoordinates();
        
        return {
            name: venueName || 'Calgary Farmers Market',
            address: '510 77 Ave SE, Calgary, AB T2H 1C3',
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
            $event.find('.title, .event-title, .market-title, .vendor-title, .activity-title, h1, h2, h3, h4, a[href*="event"]').first().text()
        );
        
        if (!title) return null;
        
        // Extract date
        const dateText = $event.find('.date, .when, .time, .event-date, .market-date').first().text();
        const eventDate = this.parseDate(dateText);
        
        // Extract description
        const description = this.cleanText(
            $event.find('.description, .summary, .excerpt, .content, p, .event-description').first().text()
        );
        
        // Extract price
        const priceText = $event.find('.price, .cost, .ticket-price, .admission, .fee').text();
        const price = priceText ? this.cleanText(priceText) : 'Free';
        
        // Extract event URL
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        // Extract image
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        // Get venue info
        const venue = this.extractVenueInfo($, eventElement);
        
        // Determine category based on title/description
        let category = 'Market';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('market')) {
            category = 'Market';
        } else if (titleLower.includes('food')) {
            category = 'Food';
        } else if (titleLower.includes('vendor')) {
            category = 'Vendor';
        } else if (titleLower.includes('farmers')) {
            category = 'Farmers';
        } else if (titleLower.includes('local')) {
            category = 'Local';
        } else if (titleLower.includes('organic')) {
            category = 'Organic';
        } else if (titleLower.includes('fresh')) {
            category = 'Fresh';
        } else if (titleLower.includes('produce')) {
            category = 'Produce';
        } else if (titleLower.includes('craft')) {
            category = 'Craft';
        } else if (titleLower.includes('handmade')) {
            category = 'Handmade';
        } else if (titleLower.includes('artisan')) {
            category = 'Artisan';
        } else if (titleLower.includes('festival')) {
            category = 'Festival';
        } else if (titleLower.includes('seasonal')) {
            category = 'Seasonal';
        } else if (titleLower.includes('harvest')) {
            category = 'Harvest';
        } else if (titleLower.includes('holiday')) {
            category = 'Holiday';
        } else if (titleLower.includes('christmas')) {
            category = 'Christmas';
        } else if (titleLower.includes('thanksgiving')) {
            category = 'Thanksgiving';
        } else if (titleLower.includes('community')) {
            category = 'Community';
        } else if (titleLower.includes('family')) {
            category = 'Family';
        } else if (titleLower.includes('kids') || titleLower.includes('children')) {
            category = 'Kids';
        } else if (titleLower.includes('cooking')) {
            category = 'Cooking';
        } else if (titleLower.includes('chef')) {
            category = 'Chef';
        } else if (titleLower.includes('demo')) {
            category = 'Demo';
        } else if (titleLower.includes('demonstration')) {
            category = 'Demonstration';
        } else if (titleLower.includes('workshop')) {
            category = 'Workshop';
        } else if (titleLower.includes('class')) {
            category = 'Class';
        } else if (titleLower.includes('tour')) {
            category = 'Tour';
        } else if (titleLower.includes('tasting')) {
            category = 'Tasting';
        } else if (titleLower.includes('sampling')) {
            category = 'Sampling';
        } else if (titleLower.includes('music')) {
            category = 'Music';
        } else if (titleLower.includes('entertainment')) {
            category = 'Entertainment';
        } else if (titleLower.includes('special')) {
            category = 'Special Event';
        }
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Calgary Farmers Market`,
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
            console.log(`🥕 Scraping events from ${this.source}...`);
            
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
                '.market-event',
                '.vendor-event',
                '.activity',
                '.festival',
                '.seasonal-event',
                '.community-event',
                '.family-event',
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
                
                // Try finding events by looking for elements with market content
                eventElements = $('[class*="event"], [class*="market"], [class*="vendor"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('market') || text.includes('vendor') || text.includes('farmers') || 
                           text.includes('food') || text.includes('local') || text.includes('craft');
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

module.exports = CalgaryFarmersMarketEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new CalgaryFarmersMarketEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('CALGARY FARMERS MARKET TEST RESULTS');
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
