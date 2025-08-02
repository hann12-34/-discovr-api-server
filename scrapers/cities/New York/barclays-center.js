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
                    
                    // Find the date element - try multiple approaches (like MSG)
                    let dateText = '';
                    
                    // Try 1: Next h4 sibling
                    let $dateEl = $el.next('h4');
                    if ($dateEl.length > 0) {
                        dateText = $dateEl.text().trim();
                    }
                    
                    // Try 2: Look for h4 within the parent container
                    if (!dateText) {
                        $dateEl = $el.parent().find('h4').first();
                        if ($dateEl.length > 0) {
                            dateText = $dateEl.text().trim();
                        }
                    }
                    
                    // Try 3: Look for any following h4 in the document
                    if (!dateText) {
                        $dateEl = $el.nextAll('h4').first();
                        if ($dateEl.length > 0) {
                            dateText = $dateEl.text().trim();
                        }
                    }
                    
                    console.log(`   📅 Date text: "${dateText}"`);
                    
                    // TEMPORARY: Allow events without dates to be extracted
                    if (!dateText) {
                        console.log(`   ⚠️ No date found, but continuing with event extraction`);
                        dateText = 'Date TBD'; // Placeholder date
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
                    
                    // Parse date and time
                    let startDate = null;
                    if (dateText) {
                        try {
                            startDate = new Date(dateText);
                            if (isNaN(startDate.getTime())) {
                                startDate = null;
                            }
                        } catch (e) {
                            console.warn(`Could not parse date: ${dateText}`);
                        }
                    }
                    
                    // Build full description
                    let fullDescription = description || `Event at ${this.venueName}`;
                    if (supportingActs) {
                        fullDescription += ` with ${supportingActs}`;
                    }
                    
                    const event = {
                        id: uuidv4(),
                        title: title,
                        description: fullDescription,
                        startDate: startDate,
                        endDate: null,
                        venue: this.venue,
                        city: this.city,
                        state: this.state,
                        country: this.country,
                        url: fullEventUrl,
                        price: priceText || null,
                        category: this.determineCategory(title),
                        source: 'Barclays Center Official',
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
            return events;
            
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

module.exports = BarclaysCenter;
