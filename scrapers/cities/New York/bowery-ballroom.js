/**
 * Scraper for Bowery Ballroom in New York
 * 
 * This scraper extracts event data from Bowery Ballroom's official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class BoweryBallroom {
    constructor() {
        this.venueName = 'Bowery Ballroom';
        this.venueId = 'bowery-ballroom';
        this.baseUrl = 'https://www.boweryballroom.com';
        this.eventsUrl = 'https://www.boweryballroom.com'; // Use main venue page like MSG
        this.city = 'New York';
        this.state = 'NY';
        this.country = 'USA';
        this.venue = {
            name: 'Bowery Ballroom',
            address: '6 Delancey St, New York, NY 10002',
            coordinates: {
                lat: 40.7184,
                lng: -73.9936
            }
        };
    }

    /**
     * Fetch and parse events from Bowery Ballroom
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        try {
            console.log(`🔍 Fetching events from ${this.venueName}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'Referer': 'https://www.google.com/',
                    'DNT': '1',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            });
            
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Parse Bowery Ballroom events using MSG-style h3 approach
            $('h3').each((index, element) => {
                try {
                    const $el = $(element);
                    
                    // Extract event title from h3 tag text (clean any markdown link brackets)
                    let title = $el.text().trim();
                    // Remove markdown link brackets if present
                    title = title.replace(/^\[(.*)\]$/, '$1');
                    
                    console.log(`🔍 Processing Bowery Ballroom h3[${index}]: "${title}"`);
                    
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
                    
                    // Extract supporting acts
                    const supportingActs = $el.find('.support, .opening-act, .with', '.featuring', '.special-guests').text().trim();
                    
                    // Extract age restrictions
                    const ageRestriction = $el.find('.age-restriction, .age, .21+, .18+, .all-ages').text().trim();
                    
                    // Extract genre/style
                    const genreText = $el.find('.genre, .category, .style, .music-type').text().trim();
                    
                    // Extract ticket status
                    const ticketStatus = $el.find('.sold-out, .available, .on-sale, .tickets-status').text().trim();
                    
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
                    let fullDescription = description || `Intimate live music performance at ${this.venueName}`;
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
                        source: 'Bowery Ballroom Official',
                        venueId: this.venueId,
                        supportingActs: supportingActs || null,
                        ageRestriction: ageRestriction || null,
                        genre: genreText || null,
                        ticketStatus: ticketStatus || null,
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
        } else if (combined.includes('singer-songwriter') || combined.includes('acoustic') || combined.includes('folk')) {
            return 'Singer-Songwriter';
        } else if (combined.includes('alternative') || combined.includes('alt rock') || combined.includes('modern rock')) {
            return 'Alternative Rock';
        } else if (combined.includes('punk') || combined.includes('post-punk') || combined.includes('garage punk')) {
            return 'Punk';
        } else if (combined.includes('electronic') || combined.includes('synth') || combined.includes('electronica')) {
            return 'Electronic';
        } else if (combined.includes('experimental') || combined.includes('avant-garde') || combined.includes('noise')) {
            return 'Experimental';
        } else if (combined.includes('pop') || combined.includes('pop rock') || combined.includes('synth pop')) {
            return 'Pop';
        } else if (combined.includes('rock') || combined.includes('garage rock') || combined.includes('classic rock')) {
            return 'Rock';
        } else if (combined.includes('hip hop') || combined.includes('rap') || combined.includes('hip-hop')) {
            return 'Hip Hop';
        } else if (combined.includes('jazz') || combined.includes('blues') || combined.includes('soul')) {
            return 'Jazz/Blues';
        } else if (combined.includes('world music') || combined.includes('latin') || combined.includes('reggae')) {
            return 'World Music';
        } else if (combined.includes('metal') || combined.includes('metalcore') || combined.includes('hardcore')) {
            return 'Metal';
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
            
            // Filter out events with invalid titles (temporarily allow events without proper dates)
            const validEvents = events.filter(event => {
                return event.title && 
                       event.title.length >= 3 && 
                       !event.title.toLowerCase().includes('newsletter') &&
                       !event.title.toLowerCase().includes('sign-up') &&
                       event.title.toLowerCase() !== "today's shows";
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

module.exports = BoweryBallroom;
