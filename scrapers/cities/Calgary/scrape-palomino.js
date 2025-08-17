const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * The Palomino Events Scraper
 * Scrapes events from The Palomino
 * URL: https://thepalomino.ca
 */
class PalominoEvents {
    constructor() {
        this.baseUrl = 'https://thepalomino.ca';
        this.eventsUrl = 'https://thepalomino.ca/events';
        this.source = 'The Palomino';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    /**
     * Get default coordinates for The Palomino
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
            name: venueName || 'The Palomino',
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
            $event.find('.title, .event-title, .show-title, .concert-title, h1, h2, h3, h4, a[href*="event"]').first().text()
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
        let category = 'Music';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('concert')) {
            category = 'Concert';
        } else if (titleLower.includes('show')) {
            category = 'Show';
        } else if (titleLower.includes('performance')) {
            category = 'Performance';
        } else if (titleLower.includes('band')) {
            category = 'Band';
        } else if (titleLower.includes('rock')) {
            category = 'Rock';
        } else if (titleLower.includes('folk')) {
            category = 'Folk';
        } else if (titleLower.includes('jazz')) {
            category = 'Jazz';
        } else if (titleLower.includes('blues')) {
            category = 'Blues';
        } else if (titleLower.includes('country')) {
            category = 'Country';
        } else if (titleLower.includes('indie')) {
            category = 'Indie';
        } else if (titleLower.includes('acoustic')) {
            category = 'Acoustic';
        } else if (titleLower.includes('open mic')) {
            category = 'Open Mic';
        } else if (titleLower.includes('singer')) {
            category = 'Singer';
        } else if (titleLower.includes('songwriter')) {
            category = 'Songwriter';
        } else if (titleLower.includes('tribute')) {
            category = 'Tribute';
        } else if (titleLower.includes('cover')) {
            category = 'Cover Band';
        } else if (titleLower.includes('original')) {
            category = 'Original Music';
        } else if (titleLower.includes('music')) {
            category = 'Music';
        } else if (titleLower.includes('comedy')) {
            category = 'Comedy';
        } else if (titleLower.includes('stand up')) {
            category = 'Stand Up';
        } else if (titleLower.includes('karaoke')) {
            category = 'Karaoke';
        } else if (titleLower.includes('dj')) {
            category = 'DJ';
        } else if (titleLower.includes('dance')) {
            category = 'Dance';
        } else if (titleLower.includes('party')) {
            category = 'Party';
        } else if (titleLower.includes('nightlife')) {
            category = 'Nightlife';
        } else if (titleLower.includes('entertainment')) {
            category = 'Entertainment';
        } else if (titleLower.includes('special')) {
            category = 'Special Event';
        }

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at The Palomino`,
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
            console.log(`🤠 Scraping events from ${this.source}...`);

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
                '.concert',
                '.performance',
                '.gig',
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

                // Try finding events by looking for elements with music content
                eventElements = $('[class*="event"], [class*="show"], [class*="concert"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('show') || text.includes('concert') || text.includes('performance') ||
                           text.includes('music') || text.includes('band') || text.includes('artist');
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

module.exports = PalominoEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-palomino.js Toronto');
    process.exit(1);
  }
        const scraper = new PalominoEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('THE PALOMINO TEST RESULTS');
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
    const scraper = new PalominoEvents();
    if (typeof scraper.scrape === 'function') {
        return await scraper.scrape(city);
    } else {
        throw new Error('No scrape method found in PalominoEvents');
    }
};