const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Ticketmaster Calgary Events Scraper
 * Scrapes events from Ticketmaster for Calgary
 */
class TicketmasterCalgaryEvents {
    constructor() {
        this.baseUrl = 'https://www.ticketmaster.ca';
        this.eventsUrl = 'https://www.ticketmaster.ca/search?ac=calgary&q=calgary';
        this.source = 'Ticketmaster Calgary';
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
        const title = this.cleanText($event.find('[data-testid="event-name"], .event-name, h3, h2, h1').first().text());
        
        if (!title) return null;
        
        const dateText = $event.find('[data-testid="event-date"], .event-date, .date, .time').first().text();
        const eventDate = this.parseDate(dateText);
        const description = this.cleanText($event.find('.event-description, .description, p').first().text());
        const price = this.cleanText($event.find('[data-testid="event-price"], .price').text()) || 'Check website for pricing';
        
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        const titleLower = title.toLowerCase();
        let category = 'Concert';
        if (titleLower.includes('hockey') || titleLower.includes('flames') || titleLower.includes('nhl')) category = 'Hockey';
        else if (titleLower.includes('sports') || titleLower.includes('game')) category = 'Sports';
        else if (titleLower.includes('theatre') || titleLower.includes('play') || titleLower.includes('musical')) category = 'Theatre';
        else if (titleLower.includes('comedy') || titleLower.includes('comedian')) category = 'Comedy';
        else if (titleLower.includes('family') || titleLower.includes('kids') || titleLower.includes('children')) category = 'Family';
        else if (titleLower.includes('dance') || titleLower.includes('ballet')) category = 'Dance';
        else if (titleLower.includes('classical') || titleLower.includes('orchestra') || titleLower.includes('symphony')) category = 'Classical';
        else if (titleLower.includes('festival')) category = 'Festival';
        else if (titleLower.includes('exhibition') || titleLower.includes('expo')) category = 'Exhibition';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} - Calgary event`,
            date: eventDate,
            venue: {
                name: 'Various Venues',
                address: 'Calgary, AB',
                city: this.city,
                province: this.province,
                latitude: coords.latitude,
                longitude: coords.longitude
            },
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
        try {
            console.log(`🎫 Scraping events from ${this.source}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            const eventSelectors = [
                '[data-testid="event-card"]',
                '.event-card',
                '.event-listing',
                '.event-item',
                '.search-result',
                '.card'
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
                eventElements = $('[class*="event"], [class*="card"], [class*="result"]');
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
            
            const uniqueEvents = this.removeDuplicates(events);
            const liveEvents = uniqueEvents.filter(event => this.isEventLive(event.date));
            
            console.log(`🎉 Successfully scraped ${liveEvents.length} unique events from ${this.source}`);
            return liveEvents;
            
        } catch (error) {
            console.error(`❌ Error scraping events from ${this.source}:`, error.message);
            return [];
        }
    }
}

module.exports = TicketmasterCalgaryEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new TicketmasterCalgaryEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('TICKETMASTER CALGARY TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);
        
        events.slice(0, 3).forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDateString() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        });
    }
    
    testScraper();
}
