/**
 * Scraper for Webster Hall in New York
 * 
 * This scraper extracts event data from Webster Hall's official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class WebsterHall {
    constructor() {
        this.venueName = 'Webster Hall';
        this.venueId = 'webster-hall';
        this.baseUrl = 'https://www.websterhall.com';
        this.eventsUrl = 'https://www.websterhall.com'; // Use main venue page like MSG
        this.city = 'New York';
        this.state = 'NY';
        this.country = 'USA';
        this.venue = {
            name: 'Webster Hall',
            address: '125 E 11th St, New York, NY 10003',
            coordinates: {
                lat: 40.7329,
                lng: -73.9876
            }
        };
    }

    /**
     * Fetch and parse events from Webster Hall
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        try {
            console.log(`🔍 Fetching events from ${this.venueName}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Referer': 'https://www.websterhall.com/'
                },
                timeout: 10000
            });
            
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Parse Webster Hall events using custom event selectors (from HTML analysis)
            $('[class*="event"], [class*="show"]').each((index, element) => {
                try {
                    const $el = $(element);
                    
                    // Extract event title from various possible selectors within event container
                    let title = '';
                    
                    // Try multiple title selectors
                    const titleSelectors = [
                        '.title', '.event-title', '.show-title', 
                        '.name', '.event-name', '.show-name',
                        'h1', 'h2', 'h3', 'h4', 'h5',
                        '.headline', '.artist-name'
                    ];
                    
                    for (const selector of titleSelectors) {
                        const titleEl = $el.find(selector).first();
                        if (titleEl.length > 0) {
                            title = titleEl.text().trim();
                            if (title && title.length >= 3) break;
                        }
                    }
                    
                    // If no title in container, try the container text itself
                    if (!title || title.length < 3) {
                        title = $el.text().trim().split('\n')[0]; // Take first line
                    }
                    
                    console.log(`🔍 Processing Webster Hall event[${index}]: "${title}"`);
                    
                    if (!title || title.length < 3) {
                        console.log(`   ❌ Skipped: title too short or empty`);
                        return;
                    }
                    
                    // Skip obvious non-events
                    const skipTerms = ['search', 'filter', 'menu', 'navigation', 'footer', 'header'];
                    if (skipTerms.some(term => title.toLowerCase().includes(term))) {
                        console.log(`   ❌ Skipped: appears to be navigation/system element`);
                        return;
                    }
                    
                    // Extract date information from the event container
                    let dateText = '';
                    
                    const dateSelectors = [
                        '.date', '.event-date', '.show-date', 
                        '.datetime', '.when', '.time',
                        '[class*="date"]', '[class*="time"]'
                    ];
                    
                    for (const selector of dateSelectors) {
                        const dateEl = $el.find(selector).first();
                        if (dateEl.length > 0) {
                            dateText = dateEl.text().trim();
                            if (dateText) break;
                        }
                    }
                    
                    console.log(`   📅 Date text: "${dateText}"`);
                    
                    // TEMPORARY: Allow events without dates to be extracted
                    if (!dateText) {
                        console.log(`   ⚠️ No date found, but continuing with event extraction`);
                        dateText = 'Date TBD'; // Placeholder date
                    }
                    
                    // Extract time information
                    const timeText = dateText; // Use dateText as fallback for timeText
                    
                    // Extract event link
                    const eventLink = $el.find('a').attr('href');
                    const fullEventUrl = eventLink ? 
                        (eventLink.startsWith('http') ? eventLink : `${this.baseUrl}${eventLink}`) : null;
                    
                    // Extract description
                    const description = $el.find('.event-description, .description, .summary, .details, .show-description').text().trim();
                    
                    // Extract price information
                    const priceText = $el.find('.price, .ticket-price, .cost, .tickets').text().trim();
                    
                    // Extract supporting acts
                    const supportingActs = $el.find('.support, .opening-act, .with', '.featuring').text().trim();
                    
                    // Extract age restrictions
                    const ageRestriction = $el.find('.age-restriction, .age, .21+, .18+, .all-ages').text().trim();
                    
                    // Extract genre/style
                    const genreText = $el.find('.genre, .category, .style, .music-type').text().trim();
                    
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
                    let fullDescription = description || `Live music event at ${this.venueName}`;
                    if (supportingActs) {
                        fullDescription += ` with special guests ${supportingActs}`;
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
                        source: 'Webster Hall Official',
                        venueId: this.venueId,
                        supportingActs: supportingActs || null,
                        ageRestriction: ageRestriction || null,
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
        
        if (combined.includes('indie rock') || combined.includes('indie') || combined.includes('alternative rock')) {
            return 'Indie Rock';
        } else if (combined.includes('electronic') || combined.includes('edm') || combined.includes('house') || combined.includes('techno')) {
            return 'Electronic';
        } else if (combined.includes('punk') || combined.includes('hardcore') || combined.includes('ska')) {
            return 'Punk';
        } else if (combined.includes('hip hop') || combined.includes('rap') || combined.includes('hip-hop')) {
            return 'Hip Hop';
        } else if (combined.includes('metal') || combined.includes('metalcore') || combined.includes('death metal')) {
            return 'Metal';
        } else if (combined.includes('pop') || combined.includes('pop rock') || combined.includes('synth pop')) {
            return 'Pop';
        } else if (combined.includes('rock') || combined.includes('garage rock') || combined.includes('classic rock')) {
            return 'Rock';
        } else if (combined.includes('folk') || combined.includes('acoustic') || combined.includes('singer-songwriter')) {
            return 'Folk';
        } else if (combined.includes('jazz') || combined.includes('blues') || combined.includes('soul')) {
            return 'Jazz/Blues';
        } else if (combined.includes('experimental') || combined.includes('avant-garde') || combined.includes('noise')) {
            return 'Experimental';
        } else if (combined.includes('tribute') || combined.includes('cover') || combined.includes('covers')) {
            return 'Tribute Act';
        } else if (combined.includes('dj') || combined.includes('dance party') || combined.includes('club night')) {
            return 'DJ/Dance Party';
        }
        
        return 'Live Music';
    }

    /**
     * Main scrape method that handles the scraping process
     * @returns {Promise<Array>} Array of formatted events
     */
    async scrape() {
        try {
            const events = await this.fetchEvents();
            
            // Filter out events with invalid dates or titles
            const validEvents = events.filter(event => {
                return event.title && 
                       event.title.length >= 3 && 
                       event.startDate && 
                       !isNaN(event.startDate.getTime());
            });
            
            console.log(`🗽 ${this.venueName}: Returning ${validEvents.length} valid events`);
            return validEvents;
            
        } catch (error) {
            console.error(`❌ ${this.venueName} scraper failed:`, error.message);
            return [];
        }
    }
}

module.exports = WebsterHall;
