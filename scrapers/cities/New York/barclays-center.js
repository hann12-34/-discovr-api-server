const { filterEvents } = require('../../utils/eventFilter');
const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Scraper for Barclays Center in Brooklyn, New York
 * 
 * This scraper extracts event data from Barclays Center's official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class BarclaysCenter {
    constructor() {
        this.venueName = 'Barclays Center';
        this.venueId = 'barclays-center';
        this.baseUrl = 'https://www.barclayscenter.com';
        this.eventsUrl = 'https://www.barclayscenter.com'; // Use main venue page like MSG
        this.city = 'Brooklyn';
        this.state = 'NY';
        this.country = 'USA';
        this.venue = {
            name: 'Barclays Center',
            address: '620 Atlantic Ave, Brooklyn, NY 11217',
            coordinates: {
                lat: 40.6826,
                lng: -73.9754
            }
        };
    }

    /**
     * Fetch and parse events from Barclays Center
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        try {
            console.log(`🔍 Fetching events from ${this.venueName}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Parse Barclays Center events using MSG-style h3 approach
            $('h3').each((index, element) => {
                try {
                    const $el = $(element);
                    
                    // Extract event title from h3 tag text (clean any markdown link brackets)
                    let title = $el.text().trim();
                    // Remove markdown link brackets if present
                    title = title.replace(/^\[(.*)\]$/, '$1');
                    
                    console.log(`🔍 Processing Barclays h3[${index}]: "${title}"`);
                    
                    if (!title || title.length < 3) {
                        console.log(`   ❌ Skipped: title too short or empty`);
                        return;
                    }
                    
                    // Find the date element - use proper Barclays selectors
                    let dateText = null;
                    
                    // Strategy 1: Look for links containing the event title
                    // Barclays website has links with format: "November 04 EventName"
                    const eventLinks = $(`a:contains("${title}")`);
                    eventLinks.each((i, link) => {
                        if (!dateText) {
                            const linkText = $(link).text().trim();
                            // Extract date pattern like "November 04" from start of link text
                            const dateMatch = linkText.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/);
                            if (dateMatch) {
                                dateText = dateMatch[0];
                            }
                        }
                    });
                    
                    // Strategy 2: Check parent/sibling containers
                    if (!dateText) {
                        const $parent = $el.parent();
                        const siblings = $parent.find('*');
                        siblings.each((i, sibling) => {
                            if (!dateText) {
                                const siblingText = $(sibling).text().trim();
                                const dateMatch = siblingText.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/);
                                if (dateMatch) {
                                    dateText = dateMatch[0];
                                }
                            }
                        });
                    }
                    
                    console.log(`   📅 Date text: "${dateText || 'NOT FOUND'}"`);
                    
                    // CRITICAL: Skip events without dates - don't use fake placeholders!
                    if (!dateText || dateText.trim() === '') {
                        console.log(`   ❌ No date found, skipping this event`);
                        return; // Skip this event
                    }
                    
                    // Extract time information (placeholder for now)
                    const timeText = dateText; // Use dateText as fallback for timeText
                    
                    // Extract event link
                    const eventLink = $el.find('a').attr('href');
                    const fullEventUrl = eventLink ? 
                        (eventLink.startsWith('http') ? eventLink : `${this.baseUrl}${eventLink}`) : null;
                    
                    // Extract description
                    const description = $el.find('.event-description, .description, .summary, .details').text().trim();
                    
                    // Extract price information
                    const priceText = $el.find('.price, .ticket-price, .cost, .tickets').text().trim();
                    
                    // Extract supporting acts or additional info
                    const supportingActs = $el.find('.support, .opening-act, .with', '.featuring').text().trim();
                    
                    // Parse date - handle various formats including date ranges
                    let startDate = null;
                    try {
                        // Handle date ranges (e.g., "October 27 - November 01")
                        if (dateText.includes(' - ')) {
                            const firstDate = dateText.split(' - ')[0].trim();
                            // Add current year if not present
                            const dateWithYear = firstDate.includes('202') ? firstDate : `${firstDate}, ${new Date().getFullYear()}`;
                            startDate = new Date(dateWithYear);
                        } 
                        // Handle single dates (e.g., "October 29")
                        else {
                            const dateWithYear = dateText.includes('202') ? dateText : `${dateText}, ${new Date().getFullYear()}`;
                            startDate = new Date(dateWithYear);
                        }
                        
                        // Validate the parsed date
                        if (isNaN(startDate.getTime())) {
                            console.log(`   ❌ Invalid date after parsing, skipping event`);
                            return; // Skip if date is invalid
                        }
                        
                        console.log(`   ✅ Parsed date: ${startDate.toDateString()}`);
                        
                    } catch (e) {
                        console.log(`   ❌ Could not parse date: ${dateText}, skipping event`);
                        return; // Skip if date parsing fails
                    }
                    
                    // Build full description
                    let fullDescription = description || `Event at ${this.venueName}`;
                    if (supportingActs) {
                        fullDescription += ` with ${supportingActs}`;
                    }
                    
                    const event = {
                        id: uuidv4(),
                        title: title,
                        description: fullDescription && fullDescription.length > 20 ? fullDescription : `${title} in New York`,
                        startDate: startDate,
                        endDate: null,
                        venue: { name: this.venueName, address: '620 Atlantic Avenue, Brooklyn, NY 11217', city: 'New York' },
                        city: this.city,
                        state: this.state,
                        country: this.country,
                        url: fullEventUrl,
                        price: priceText || null,
                        category: this.determineCategory(title),
                        source: 'Barclays Center Official',
                        date: startDate ? startDate.toISOString() : null,
                        time: timeText,
                        location: this.venue.address,
                        coordinates: this.venue.coordinates,
                        venueId: this.venueId,
                        supportingActs: supportingActs || null,
                        rawDateText: dateText,
                        rawTimeText: timeText,
                        scrapedAt: new Date().toISOString()
                    };
                    
                    events.push(event);
                    
                } catch (error) {
                    console.error(`Error parsing event at index ${index}:`, error.message);
                }
            });
            
            console.log(`✅ ${this.venueName}: Found ${events.length} events`);
            return filterEvents(events);
            
        } catch (error) {
            console.error(`❌ Error fetching events from ${this.venueName}:`, error.message);
            return [];
        }
    }

    /**
     * Determine event category based on title
     * @param {string} title - Event title
     * @returns {string} - Event category
     */
    determineCategory(title) {
        const titleLower = title.toLowerCase();
        
        if (titleLower.includes('nets') || titleLower.includes('basketball') || titleLower.includes('nba')) {
            return 'Basketball';
        } else if (titleLower.includes('islanders') || titleLower.includes('hockey') || titleLower.includes('nhl')) {
            return 'Hockey';
        } else if (titleLower.includes('concert') || titleLower.includes('tour') || titleLower.includes('live') || titleLower.includes('music')) {
            return 'Concert';
        } else if (titleLower.includes('boxing') || titleLower.includes('fight') || titleLower.includes('mma') || titleLower.includes('ufc')) {
            return 'Combat Sports';
        } else if (titleLower.includes('graduation') || titleLower.includes('ceremony') || titleLower.includes('commencement')) {
            return 'Graduation';
        } else if (titleLower.includes('family') || titleLower.includes('disney') || titleLower.includes('kids')) {
            return 'Family Entertainment';
        } else if (titleLower.includes('comedy') || titleLower.includes('comedian') || titleLower.includes('stand-up')) {
            return 'Comedy';
        } else if (titleLower.includes('religious') || titleLower.includes('church') || titleLower.includes('conference')) {
            return 'Conference';
        }
        
        return 'Event';
    }

    /**
     * Main scrape method that handles the scraping process
     * @returns {Promise<Array>} Array of formatted events
     */
    async scrape() {
        try {
            const events = await this.fetchEvents();
            
            // Filter out events with invalid titles (temporarily allow events without proper dates)
            const validEvents = events.filter(event => {
                return event.title && 
                       event.title.length >= 3 && 
                       !event.title.toLowerCase().includes('cancelled') &&
                       !event.title.toLowerCase().includes('planet brooklyn') &&
                       event.title.toLowerCase() !== 'from zero world tour';
                       // Temporarily removed date validation to extract real events
            });
            
            console.log(`🗽 ${this.venueName}: Returning ${validEvents.length} valid events`);
            return validEvents;
            
        } catch (error) {
            console.error(`❌ ${this.venueName} scraper failed:`, error.message);
            return [];
        }
    }
}

// Convert to function export for orchestrator compatibility
async function scrapeBarclaysCenter() {
    const scraper = new BarclaysCenter();
    return await scraper.scrape();
}

module.exports = scrapeBarclaysCenter;
