/**
 * Scraper for Radio City Music Hall in New York
 * 
 * This scraper extracts event data from Radio City Music Hall's official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class RadioCityMusicHall {
    constructor() {
        this.venueName = 'Radio City Music Hall';
        this.venueId = 'radio-city-music-hall';
        this.baseUrl = 'https://www.msg.com';
        this.eventsUrl = 'https://www.msg.com/radio-city-music-hall'; // Use main venue page like MSG
        this.city = 'New York';
        this.state = 'NY';
        this.country = 'USA';
        this.venue = {
            name: 'Radio City Music Hall',
            address: '1260 6th Ave, New York, NY 10020',
            coordinates: {
                lat: 40.7599,
                lng: -73.9799
            }
        };
    }

    /**
     * Fetch and parse events from Radio City Music Hall
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
            
            // Parse Radio City Music Hall events using MSG-style h3 approach
            $('h3').each((index, element) => {
                try {
                    const $el = $(element);
                    
                    // Extract event title from h3 tag text (clean any markdown link brackets)
                    let title = $el.text().trim();
                    // Remove markdown link brackets if present
                    title = title.replace(/^\[(.*)\]$/, '$1');
                    
                    console.log(`🔍 Processing Radio City h3[${index}]: "${title}"`);
                    
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
                    const description = $el.find('.event-description, .description, .summary, .details, .show-description').text().trim();
                    
                    // Extract price information
                    const priceText = $el.find('.price, .ticket-price, .cost, .tickets').text().trim();
                    
                    // Extract artist/performer information
                    const artistText = $el.find('.artist, .performer, .headliner').text().trim();
                    
                    // Extract show type/genre
                    const genreText = $el.find('.genre, .category, .show-type').text().trim();
                    
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
                        category: this.determineCategory(title, description, genreText),
                        source: 'Radio City Music Hall Official',
                        venueId: this.venueId,
                        artist: artistText || null,
                        genre: genreText || null,
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
     * Determine event category based on title, description, and genre
     * @param {string} title - Event title
     * @param {string} description - Event description
     * @param {string} genre - Event genre
     * @returns {string} - Event category
     */
    determineCategory(title, description = '', genre = '') {
        const combined = `${title} ${description} ${genre}`.toLowerCase();
        
        if (combined.includes('christmas spectacular') || combined.includes('rockettes')) {
            return 'Christmas Spectacular';
        } else if (combined.includes('concert') || combined.includes('tour') || combined.includes('live music')) {
            return 'Concert';
        } else if (combined.includes('comedy') || combined.includes('comedian') || combined.includes('stand-up')) {
            return 'Comedy';
        } else if (combined.includes('tony') || combined.includes('awards') || combined.includes('ceremony')) {
            return 'Awards Show';
        } else if (combined.includes('dance') || combined.includes('ballet') || combined.includes('performance')) {
            return 'Dance Performance';
        } else if (combined.includes('family') || combined.includes('children') || combined.includes('kids')) {
            return 'Family Entertainment';
        } else if (combined.includes('graduation') || combined.includes('ceremony') || combined.includes('commencement')) {
            return 'Graduation';
        } else if (combined.includes('benefit') || combined.includes('gala') || combined.includes('fundraiser')) {
            return 'Benefit/Gala';
        } else if (combined.includes('gospel') || combined.includes('religious') || combined.includes('spiritual')) {
            return 'Gospel/Religious';
        } else if (combined.includes('television') || combined.includes('tv') || combined.includes('taping') || combined.includes('filming')) {
            return 'Television Production';
        }
        
        return 'Entertainment';
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
                       !event.title.toLowerCase().includes('concessions') &&
                       !event.title.toLowerCase().includes('rockettes merch') &&
                       !event.title.toLowerCase().includes('tour');
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

module.exports = RadioCityMusicHall;
