/**
 * Scraper for Madison Square Garden in New York
 * 
 * This scraper extracts event data from MSG's official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class MadisonSquareGarden {
    constructor() {
        this.venueName = 'Madison Square Garden';
        this.venueId = 'madison-square-garden';
        this.baseUrl = 'https://www.msg.com';
        this.eventsUrl = 'https://www.msg.com/madison-square-garden';
        this.city = 'New York';
        this.state = 'NY';
        this.country = 'USA';
        this.venue = {
            name: 'Madison Square Garden',
            address: '4 Pennsylvania Plaza, New York, NY 10001',
            coordinates: {
                lat: 40.7505,
                lng: -73.9934
            }
        };
    }

    /**
     * Fetch and parse events from Madison Square Garden
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
            
            // Parse MSG's venue page event structure - events are in h3 tags with dates in h4 tags
            $('h3').each((index, element) => {
                try {
                    const $el = $(element);
                    
                    // Extract event title from h3 tag text (clean any markdown link brackets)
                    let title = $el.text().trim();
                    // Remove markdown link brackets if present
                    title = title.replace(/^\[(.*)\]$/, '$1');
                    
                    console.log(`🔍 Processing h3[${index}]: "${title}"`);
                    
                    if (!title || title.length < 3) {
                        console.log(`   ❌ Skipped: title too short or empty`);
                        return;
                    }
                    
                    // Find the date element - try multiple approaches
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
                    
                    // Extract event link
                    const eventLink = $el.find('a').attr('href');
                    const fullEventUrl = eventLink ? 
                        (eventLink.startsWith('http') ? eventLink : `${this.baseUrl}${eventLink}`) : null;
                    
                    // Extract description
                    const description = $el.find('.event-description, .description, .summary').text().trim();
                    
                    // Extract price information
                    const priceText = $el.find('.price, .ticket-price, .cost').text().trim();
                    
                    // Extract time information (placeholder for now)
                    const timeText = dateText; // Use dateText as fallback for timeText
                    
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
                    
                    const event = {
                        id: uuidv4(),
                        title: title,
                        description: description || `Event at ${this.venueName}`,
                        startDate: startDate,
                        endDate: null,
                        venue: this.venue,
                        city: this.city,
                        state: this.state,
                        country: this.country,
                        url: fullEventUrl,
                        price: priceText || null,
                        category: this.determineCategory(title),
                        source: 'MSG Official',
                        venueId: this.venueId,
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
        
        if (titleLower.includes('knicks') || titleLower.includes('basketball') || titleLower.includes('nba')) {
            return 'Basketball';
        } else if (titleLower.includes('rangers') || titleLower.includes('hockey') || titleLower.includes('nhl')) {
            return 'Hockey';
        } else if (titleLower.includes('concert') || titleLower.includes('tour') || titleLower.includes('live')) {
            return 'Concert';
        } else if (titleLower.includes('boxing') || titleLower.includes('fight') || titleLower.includes('ufc')) {
            return 'Combat Sports';
        } else if (titleLower.includes('circus') || titleLower.includes('family') || titleLower.includes('show')) {
            return 'Family Entertainment';
        } else if (titleLower.includes('comedy') || titleLower.includes('comedian')) {
            return 'Comedy';
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
                       !event.title.toLowerCase().includes('concession') &&
                       !event.title.toLowerCase().includes('premium hospitality') &&
                       !event.title.toLowerCase().includes('tour experience');
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

module.exports = MadisonSquareGarden;
