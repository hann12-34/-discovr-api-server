const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Ticketmaster Calgary Enhanced Events Scraper
 * Enhanced version with multiple URL attempts and better selectors
 */
class TicketmasterCalgaryEnhancedEvents {
    constructor() {
        this.baseUrl = 'https://www.ticketmaster.ca';
        this.possibleUrls = [
            'https://www.ticketmaster.ca/discover/concerts/calgary',
            'https://www.ticketmaster.ca/search?q=calgary',
            'https://www.ticketmaster.ca/discover/sports/calgary',
            'https://www.ticketmaster.ca/browse/arts-theater-id-10002/calgary',
            'https://www.ticketmaster.ca/browse/family-id-10003/calgary',
            'https://www.ticketmaster.ca/city/calgary',
            'https://www.ticketmaster.ca/discover/events/calgary'
        ];
        this.source = 'Ticketmaster Calgary Enhanced';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    getDefaultCoordinates() {
        return { latitude: 51.0447, longitude: -114.0719 };
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleaned = dateStr.trim();
            const dateMatch = cleaned.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
            if (dateMatch) {
                return new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`);
            }
            return new Date(cleaned);
        } catch (error) {
            return null;
        }
    }

    cleanText(text) {
        return text ? text.replace(/\s+/g, ' ').trim() : '';
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        const titleSelectors = [
            'h1', 'h2', 'h3', 'h4',
            '.event-title', '.title', '.event-name',
            '.card-title', '.entry-title', '.post-title',
            '.event-card__title', '.listing-title', '.show-title',
            '[data-testid="event-title"]', '[data-bdd="event-title"]'
        ];
        
        let title = '';
        for (const selector of titleSelectors) {
            title = this.cleanText($event.find(selector).first().text());
            if (title && title.length > 3) break;
        }
        
        // If no title found with selectors, try direct text extraction
        if (!title) {
            const directText = this.cleanText($event.text());
            if (directText && directText.length > 5 && directText.length < 200) {
                title = directText.substring(0, 100);
            }
        }
        
        if (!title || title.length < 3) return null;
        
        const dateSelectors = [
            '.event-date', '.date', '.event-time',
            '.datetime', '.when', '.schedule',
            '.event-card__date', '.listing-date', '.show-date',
            '[data-testid="event-date"]', '[data-bdd="event-date"]'
        ];
        
        let dateText = '';
        for (const selector of dateSelectors) {
            dateText = $event.find(selector).first().text();
            if (dateText) break;
        }
        
        const eventDate = this.parseDate(dateText);
        
        const descSelectors = [
            '.event-description', '.description', '.content',
            '.excerpt', '.summary', 'p'
        ];
        
        let description = '';
        for (const selector of descSelectors) {
            description = this.cleanText($event.find(selector).first().text());
            if (description && description.length > 10) break;
        }
        
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        const venueSelectors = [
            '.venue', '.venue-name', '.location',
            '.event-card__venue', '.listing-venue'
        ];
        
        let venueName = '';
        for (const selector of venueSelectors) {
            venueName = this.cleanText($event.find(selector).first().text());
            if (venueName && venueName.length > 3) break;
        }
        
        const titleLower = title.toLowerCase();
        const descLower = description.toLowerCase();
        const venueNameLower = venueName.toLowerCase();
        const combinedText = `${titleLower} ${descLower} ${venueNameLower}`;
        
        let category = 'Ticketed Event';
        if (combinedText.includes('concert') || combinedText.includes('music') || combinedText.includes('band')) category = 'Concert';
        else if (combinedText.includes('sport') || combinedText.includes('game') || combinedText.includes('hockey')) category = 'Sports';
        else if (combinedText.includes('theater') || combinedText.includes('theatre') || combinedText.includes('play')) category = 'Theatre';
        else if (combinedText.includes('comedy') || combinedText.includes('stand-up') || combinedText.includes('comedian')) category = 'Comedy';
        else if (combinedText.includes('family') || combinedText.includes('kids') || combinedText.includes('children')) category = 'Family';
        else if (combinedText.includes('dance') || combinedText.includes('ballet') || combinedText.includes('musical')) category = 'Dance/Musical';
        else if (combinedText.includes('exhibition') || combinedText.includes('expo') || combinedText.includes('show')) category = 'Exhibition';
        else if (combinedText.includes('classical') || combinedText.includes('opera') || combinedText.includes('symphony')) category = 'Classical';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} - Ticketmaster Event`,
            date: eventDate,
            venue: {
                name: venueName || 'Calgary Venue',
                address: 'Calgary, AB',
                city: this.city,
                province: this.province,
                latitude: coords.latitude,
                longitude: coords.longitude
            },
            city: this.city,
            province: this.province,
            price: 'Ticketed',
            category: category,
            source: this.source,
            url: fullEventUrl,
            image: fullImageUrl,
            scrapedAt: new Date()
        };
    }

    isEventLive(eventDate) {
        if (!eventDate) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }

    removeDuplicates(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.date ? event.date.toDateString() : 'no-date'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async scrapeEvents() {
        console.log(`🎟️ Enhanced scraping events from ${this.source}...`);
        
        for (const url of this.possibleUrls) {
            try {
                console.log(`📍 Trying URL: ${url}`);
                
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });
                
                const $ = cheerio.load(response.data);
                const events = [];
                
                const eventSelectors = [
                    '.event', '.event-card', '.event-item', '.event-listing',
                    '.card', '.post', '.entry', '.concert',
                    '.show', '.performance', '.gig', '.ticket',
                    '[data-testid*="event"]', '[data-testid*="listing"]',
                    '[class*="event"]', '[class*="concert"]',
                    '[class*="show"]', '[class*="card"]',
                    '[class*="result"]', '[class*="search"]'
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
                    eventElements = $('div, section, article').filter(function() {
                        const text = $(this).text().toLowerCase();
                        return text.includes('event') || text.includes('concert') || text.includes('show') || text.includes('tickets');
                    });
                }
                
                console.log(`📅 Processing ${eventElements.length} potential events...`);
                
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
                });
                
                if (events.length > 0) {
                    const uniqueEvents = this.removeDuplicates(events);
                    const liveEvents = uniqueEvents.filter(event => this.isEventLive(event.date));
                    
                    console.log(`🎉 Successfully scraped ${liveEvents.length} unique events from ${this.source}`);
                    return liveEvents;
                }
                
                console.log(`📊 Found ${eventElements.length} elements but no extractable events from ${url}`);
                continue;
                
            } catch (error) {
                console.log(`❌ Error with URL ${url}:`, error.message);
                continue;
            }
        }
        
        console.log(`⚠️  No events found from any Ticketmaster Calgary URL`);
        return [];
    }
}

module.exports = TicketmasterCalgaryEnhancedEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new TicketmasterCalgaryEnhancedEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('TICKETMASTER CALGARY ENHANCED TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);
        
        events.slice(0, 3).forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDateString() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        });
    }
    
    testScraper();
}
