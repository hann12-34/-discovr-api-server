/**
 * Scraper for Now Playing Toronto Special Events
 * 
 * This scraper extracts event data from https://nowplayingtoronto.com/categories/special-events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class NowPlayingTorontoEvents {
    constructor() {
        this.venueName = 'Now Playing Toronto';
        this.venueId = 'nowplaying-toronto-events';
        this.baseUrl = 'https://nowplayingtoronto.com';
        this.eventsUrl = 'https://nowplayingtoronto.com/categories/festivals-special-events/';
        this.city = 'Toronto';
        this.province = 'ON';
        this.country = 'Canada';
    }

    /**
     * Fetch and parse events
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        try {
            console.log(`🔍 Fetching events from ${this.venueName}...`);
            
            // Make HTTP request to the events page
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            // Check if response is valid
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            // Parse HTML content
            const $ = cheerio.load(response.data);
            
            // Array to store all events
            const events = [];
            
            // Look for event articles with the correct selector
            const eventElements = $('article.category-itm.category-page-event-box');
            console.log(`📊 Found ${eventElements.length} event elements`);
            
            // If no events found, return empty array
            if (eventElements.length === 0) {
                console.log('⚠️ No event elements found on nowplayingtoronto.com');
                console.log('🎉 No real events found, returning empty array (no fallback data)');
                return [];
            }
            
            // Process found elements
            eventElements.each((index, element) => {
                try {
                    // Extract data from the element
                    const name = $(element).find('h2').first().text().trim();
                    
                    // Get event URL from link
                    let eventUrl = $(element).find('a[href*="/event/"]').first().attr('href');
                    if (eventUrl && !eventUrl.startsWith('http')) {
                        eventUrl = this.baseUrl + eventUrl;
                    }
                    
                    // Extract date from the date bubble
                    const dateMonth = $(element).find('.month span').first().text().trim();
                    const dateDay = $(element).find('.month span').eq(1).text().trim();
                    const dateYear = $(element).find('.month span').eq(2).text().trim();
                    
                    let dateString = '';
                    if (dateMonth && dateDay && dateYear) {
                        dateString = `${dateMonth} ${dateDay}, ${dateYear}`;
                    }
                    
                    // Get image URL
                    const imageUrl = this.extractImageUrl($, element);
                    
                    // Skip if no name found
                    if (!name) {
                        console.log(`⚠️ Skipping event ${index + 1}: No name found`);
                        return;
                    }
                    
                    // Parse date
                    const startDate = this.parseDate(dateString);
                    
                    // Create event object
                    const event = {
                        id: uuidv4(),
                        name: name,
                        title: name,
                        description: null,
                        startDate: startDate,
                        endDate: null,
                        venue: {
                            name: this.venueName,
                            id: this.venueId,
                            address: 'Various Locations',
                            city: this.city,
                            province: this.province,
                            country: this.country,
                            coordinates: this.getDefaultCoordinates()
                        },
                        price: null,
                        category: 'Special Events',
                        subcategory: null,
                        tags: ['special-events', 'toronto'],
                        imageUrl: imageUrl,
                        officialWebsite: eventUrl,
                        ticketUrl: eventUrl,
                        source: this.venueName
                    };
                    
                    events.push(event);
                    console.log(`✅ Processed event: ${name}`);
                    
                } catch (error) {
                    console.error(`❌ Error processing event ${index + 1}:`, error.message);
                    // Continue processing other events - no fallback data
                }
            });
            
            console.log(`🎉 Successfully scraped ${events.length} events from ${this.venueName}`);
            return events;
            
        } catch (error) {
            console.error(`❌ Error fetching events from ${this.venueName}:`, error.message);
            return [];
        }
    }

    /**
     * Parse date string into ISO format
     * @param {string} dateString - Raw date string
     * @returns {string|null} ISO date string or null
     */
    parseDate(dateString) {
        try {
            // Common date patterns for Now Playing Toronto
            const patterns = [
                /(\w+\s+\d{1,2},?\s+\d{4})/i, // "January 15, 2024"
                /(\d{1,2}\/\d{1,2}\/\d{4})/,   // "01/15/2024"
                /(\d{4}-\d{2}-\d{2})/,         // "2024-01-15"
                /(\w+\s+\d{1,2})/i,            // "January 15"
                /(\d{1,2}\s+\w+\s+\d{4})/i    // "15 January 2024"
            ];
            
            for (const pattern of patterns) {
                const match = dateString.match(pattern);
                if (match) {
                    const date = new Date(match[1]);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing date:', error.message);
            return null;
        }
    }

    /**
     * Parse price from text
     * @param {string} priceText - Raw price text
     * @returns {string|null} Cleaned price or null
     */
    parsePrice(priceText) {
        if (!priceText) return null;
        
        // Check for free events
        if (/free|no cost|complimentary|no charge/i.test(priceText)) {
            return 'Free';
        }
        
        // Extract price numbers
        const priceMatch = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
        if (priceMatch) {
            return priceMatch[0];
        }
        
        return priceText.trim();
    }

    /**
     * Extract venue information from text
     * @param {string} description - Event description
     * @param {string} location - Location string
     * @returns {object} Venue information
     */
    extractVenueInfo(description, location) {
        const venueInfo = {
            name: null,
            address: null,
            coordinates: null
        };
        
        // Common Toronto venues and their coordinates
        const knownVenues = {
            'roy thomson hall': { lat: 43.6465, lng: -79.3863 },
            'massey hall': { lat: 43.6544, lng: -79.3807 },
            'harbourfront centre': { lat: 43.6387, lng: -79.3816 },
            'distillery district': { lat: 43.6503, lng: -79.3594 },
            'casa loma': { lat: 43.6780, lng: -79.4094 },
            'cn tower': { lat: 43.6426, lng: -79.3871 },
            'ontario place': { lat: 43.6286, lng: -79.4155 }
        };
        
        const text = (description + ' ' + location).toLowerCase();
        
        for (const [venue, coords] of Object.entries(knownVenues)) {
            if (text.includes(venue)) {
                venueInfo.name = venue.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                venueInfo.coordinates = {
                    latitude: coords.lat,
                    longitude: coords.lng
                };
                break;
            }
        }
        
        return venueInfo;
    }

    /**
     * Extract venue name from location string
     * @param {string} location - Location string
     * @returns {string|null} Venue name or null
     */
    extractVenueName(location) {
        if (!location) return null;
        
        // Split by common separators and take the first part as venue name
        const parts = location.split(/[,\-\|]/);
        return parts[0]?.trim() || null;
    }

    /**
     * Extract image URL from element
     * @param {object} $ - Cheerio instance
     * @param {object} element - DOM element
     * @returns {string|null} Image URL or null
     */
    extractImageUrl($, element) {
        const img = $(element).find('img').first();
        if (img.length) {
            let src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
            if (src && !src.startsWith('http')) {
                src = this.baseUrl + src;
            }
            return src;
        }
        return null;
    }

    /**
     * Get default coordinates for Toronto
     * @returns {object} Coordinates object
     */
    getDefaultCoordinates() {
        return {
            latitude: 43.6532,
            longitude: -79.3832
        };
    }

    /**
     * Get venue information
     * @returns {object} Venue details
     */
    getVenueInfo() {
        return {
            name: this.venueName,
            id: this.venueId,
            address: 'Various Venues',
            city: this.city,
            province: this.province,
            country: this.country,
            coordinates: this.getDefaultCoordinates(),
            website: this.baseUrl,
            type: 'events-listing'
        };
    }
}

module.exports = NowPlayingTorontoEvents;
