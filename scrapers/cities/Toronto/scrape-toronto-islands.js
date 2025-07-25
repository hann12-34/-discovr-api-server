const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Toronto Islands Events Scraper
 * Scrapes events from Toronto Islands
 */
class TorontoIslandsEvents {
    constructor() {
        this.baseUrl = 'https://www.torontoisland.com';
        this.eventsUrl = 'https://www.torontoisland.com/events';
        this.source = 'Toronto Islands';
        this.city = 'Toronto';
        this.province = 'ON';
    }

    getDefaultCoordinates() {
        return { latitude: 43.6205, longitude: -79.3789 };
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
        const title = this.cleanText($event.find('.title, .event-title, h1, h2, h3, a').first().text());
        
        if (!title) return null;
        
        const dateText = $event.find('.date, .when, .time').first().text();
        const eventDate = this.parseDate(dateText);
        const description = this.cleanText($event.find('.description, .summary, p').first().text());
        const price = this.cleanText($event.find('.price, .cost').text()) || 'Check website for pricing';
        
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        const titleLower = title.toLowerCase();
        let category = 'Island Event';
        if (titleLower.includes('ferry')) category = 'Ferry';
        else if (titleLower.includes('beach')) category = 'Beach Event';
        else if (titleLower.includes('park')) category = 'Park Event';
        else if (titleLower.includes('concert')) category = 'Concert';
        else if (titleLower.includes('festival')) category = 'Festival';
        else if (titleLower.includes('family')) category = 'Family Event';
        else if (titleLower.includes('outdoor')) category = 'Outdoor Event';
        else if (titleLower.includes('nature')) category = 'Nature Event';
        else if (titleLower.includes('walk')) category = 'Walk';
        else if (titleLower.includes('tour')) category = 'Tour';
        else if (titleLower.includes('picnic')) category = 'Picnic';
        else if (titleLower.includes('bike')) category = 'Bike Event';
        else if (titleLower.includes('kayak')) category = 'Kayak Event';
        else if (titleLower.includes('sailing')) category = 'Sailing Event';
        else if (titleLower.includes('water')) category = 'Water Event';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Toronto Islands`,
            date: eventDate,
            venue: {
                name: 'Toronto Islands',
                address: 'Toronto Islands, Toronto, ON',
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
            console.log(`🏝️ Scraping events from ${this.source}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            const eventSelectors = ['.event', '.event-item', '.event-card', '.island-event', '.activity', '.listing'];
            
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
                eventElements = $('[class*="event"], [class*="activity"], [class*="island"]');
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

module.exports = TorontoIslandsEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new TorontoIslandsEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('TORONTO ISLANDS TEST RESULTS');
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
