/**
 * Scraper for Lincoln Center in New York
 * 
 * This scraper extracts event data from Lincoln Center's official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class LincolnCenter {
    constructor() {
        this.venueName = 'Lincoln Center';
        this.venueId = 'lincoln-center';
        this.baseUrl = 'https://www.lincolncenter.org';
        this.eventsUrl = 'https://www.lincolncenter.org'; // Use main venue page like MSG/Barclays
        this.city = 'New York';
        this.state = 'NY';
        this.country = 'USA';
        this.venue = {
            name: 'Lincoln Center',
            address: '10 Lincoln Center Plaza, New York, NY 10023',
            coordinates: {
                lat: 40.7723,
                lng: -73.9836
            }
        };
    }

    /**
     * Fetch and parse events from Lincoln Center
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
            
            // Parse Lincoln Center events using MSG-style h3 approach
            $('h3').each((index, element) => {
                try {
                    const $el = $(element);
                    
                    // Extract event title from h3 tag text (clean any markdown link brackets)
                    let title = $el.text().trim();
                    // Remove markdown link brackets if present
                    title = title.replace(/^\[(.*)\]$/, '$1');
                    
                    console.log(`🔍 Processing Lincoln Center h3[${index}]: "${title}"`);
                    
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
                    const description = $el.find('.event-description, .description, .summary, .details, .performance-description').text().trim();
                    
                    // Extract price information
                    const priceText = $el.find('.price, .ticket-price, .cost, .tickets').text().trim();
                    
                    // Extract venue information (specific hall within Lincoln Center)
                    const venueText = $el.find('.venue, .hall, .location, .theater').text().trim();
                    
                    // Extract artist/performer information
                    const artistText = $el.find('.artist, .performer, .company, .orchestra').text().trim();
                    
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
                    if (artistText) {
                        fullDescription += ` featuring ${artistText}`;
                    }
                    if (venueText) {
                        fullDescription += ` at ${venueText}`;
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
                        category: this.determineCategory(title, description),
                        source: 'Lincoln Center Official',
                        venueId: this.venueId,
                        specificVenue: venueText || null,
                        artist: artistText || null,
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
     * Determine event category based on title and description
     * @param {string} title - Event title
     * @param {string} description - Event description
     * @returns {string} - Event category
     */
    determineCategory(title, description = '') {
        const combined = `${title} ${description}`.toLowerCase();
        
        if (combined.includes('opera') || combined.includes('metropolitan opera')) {
            return 'Opera';
        } else if (combined.includes('ballet') || combined.includes('dance') || combined.includes('american ballet')) {
            return 'Ballet/Dance';
        } else if (combined.includes('symphony') || combined.includes('philharmonic') || combined.includes('orchestra') || combined.includes('classical')) {
            return 'Classical Music';
        } else if (combined.includes('jazz') || combined.includes('jazz at lincoln center')) {
            return 'Jazz';
        } else if (combined.includes('chamber music') || combined.includes('recital') || combined.includes('quartet')) {
            return 'Chamber Music';
        } else if (combined.includes('theater') || combined.includes('play') || combined.includes('drama')) {
            return 'Theater';
        } else if (combined.includes('film') || combined.includes('movie') || combined.includes('cinema')) {
            return 'Film';
        } else if (combined.includes('lecture') || combined.includes('talk') || combined.includes('discussion')) {
            return 'Lecture/Talk';
        } else if (combined.includes('family') || combined.includes('children') || combined.includes('kids')) {
            return 'Family';
        } else if (combined.includes('education') || combined.includes('workshop') || combined.includes('masterclass')) {
            return 'Education';
        }
        
        return 'Cultural Event';
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
                       !event.title.toLowerCase().includes('subscription') &&
                       !event.title.toLowerCase().includes('membership') &&
                       !event.title.toLowerCase().includes('support');
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

module.exports = LincolnCenter;
