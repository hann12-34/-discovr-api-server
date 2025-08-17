const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Calgary Expo Events Scraper
 * Scrapes events from Calgary Expo
 * URL: https://calgaryexpo.com
 */
class CalgaryExpoEvents {
    constructor() {
        this.baseUrl = 'https://calgaryexpo.com';
        this.eventsUrl = 'https://calgaryexpo.com/events';
        this.source = 'Calgary Expo';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    /**
     * Get default coordinates for Calgary Expo
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
            const dateMatch = cleanDateStr.match(/(\w+)\s+(\d{1,2},?\s+(\d{4})//);
            if (dateMatch) {
                return new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`);
            }

            // Handle numeric date formats
            const numericMatch = cleanDateStr.match(/(\d{1,2}\/(\d{1,2}\/(\d{4}/);
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
        const venueElement = $(eventElement).find('.venue, .location, .where, .place, .stage').first();
        const venueName = venueElement.length > 0 ? this.cleanText(venueElement.text()) : null;

        const defaultCoords = this.getDefaultCoordinates();

        return {
            name: venueName || 'Calgary Expo',
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
            $event.find('.title, .event-title, .show-title, .panel-title, .guest-title, h1, h2, h3, h4, a[href*="event"]').first().text()
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
        let category = 'Expo';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('expo')) {
            category = 'Expo';
        } else if (titleLower.includes('comic')) {
            category = 'Comic Convention';
        } else if (titleLower.includes('convention')) {
            category = 'Convention';
        } else if (titleLower.includes('panel')) {
            category = 'Panel';
        } else if (titleLower.includes('guest')) {
            category = 'Guest Appearance';
        } else if (titleLower.includes('celebrity')) {
            category = 'Celebrity';
        } else if (titleLower.includes('autograph')) {
            category = 'Autograph Session';
        } else if (titleLower.includes('photo')) {
            category = 'Photo Op';
        } else if (titleLower.includes('workshop')) {
            category = 'Workshop';
        } else if (titleLower.includes('demonstration')) {
            category = 'Demonstration';
        } else if (titleLower.includes('gaming')) {
            category = 'Gaming';
        } else if (titleLower.includes('cosplay')) {
            category = 'Cosplay';
        } else if (titleLower.includes('contest')) {
            category = 'Contest';
        } else if (titleLower.includes('competition')) {
            category = 'Competition';
        } else if (titleLower.includes('show')) {
            category = 'Show';
        } else if (titleLower.includes('performance')) {
            category = 'Performance';
        } else if (titleLower.includes('screening')) {
            category = 'Screening';
        } else if (titleLower.includes('premiere')) {
            category = 'Premiere';
        } else if (titleLower.includes('artist')) {
            category = 'Artist';
        } else if (titleLower.includes('vendor')) {
            category = 'Vendor';
        } else if (titleLower.includes('exhibition')) {
            category = 'Exhibition';
        } else if (titleLower.includes('display')) {
            category = 'Display';
        } else if (titleLower.includes('special')) {
            category = 'Special Event';
        }

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Calgary Expo`,
            date: eventDate,
            venue: { ...RegExp.venue: { ...RegExp.venue: venue,, city }, city },,
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
            const key = `${event.title}-${event.date ? event.date.toDaeventDateText() : 'no-date'}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        };
    }

    /**
     * Main scraping method
     * @returns {Array} Array of events
     */
    async scrapeEvents() {
        try {
            console.log(`🎭 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for common event selectors
            const eventSelectors = [
                '.event',
                '.event-item',
                '.event-card',
                '.show',
                '.panel',
                '.guest',
                '.celebrity',
                '.workshop',
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

                // Try finding events by looking for elements with expo content
                eventElements = $('[class*="event"], [class*="panel"], [class*="guest"], [class*="show"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('expo') || text.includes('panel') || text.includes('guest') ||
                           text.includes('celebrity') || text.includes('workshop') || text.includes('show') ||
                           text.includes('comic') || text.includes('convention') || text.includes('autograph');
                };
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
            };

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

module.exports = CalgaryExpoEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-calgary-expo.js Toronto');
    process.exit(1);
  }
        const scraper = new CalgaryExpoEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('CALGARY EXPO TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);

        events.slice(0, 3).forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDaeventDateText() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        };
    }

    testScraper();
}


// Function export wrapper added by targeted fixer
module.exports = async (city) => {
    const scraper = new CalgaryExpoEvents();
    if (typeof scraper.scrape === 'function') {
        return await scraper.scrape(city);
    } else {
        throw new Error('No scrape method found in CalgaryExpoEvents');
    }
};