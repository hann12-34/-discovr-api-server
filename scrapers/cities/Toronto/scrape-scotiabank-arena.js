const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Scotiabank Arena Events Scraper
 * Scrapes events from Scotiabank Arena Toronto (home of Leafs and Raptors)
 */
class ScotiabankArenaEvents {
    constructor() {
        this.baseUrl = 'https://www.scotiabankarena.com';
        this.eventsUrl = 'https://www.scotiabankarena.com/events';
        this.source = 'Scotiabank Arena';
        this.city = 'Toronto';
        this.province = 'ON';
    }

    getDefaultCoordinates() {
        return { latitude: 43.6434, longitude: -79.3791 };
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
        let category = 'Sports Event';
        if (titleLower.includes('leafs') || titleLower.includes('hockey')) category = 'Hockey';
        else if (titleLower.includes('raptors') || titleLower.includes('basketball')) category = 'Basketball';
        else if (titleLower.includes('concert') || titleLower.includes('music')) category = 'Concert';
        else if (titleLower.includes('show')) category = 'Show';
        else if (titleLower.includes('wrestling')) category = 'Wrestling';
        else if (titleLower.includes('ufc') || titleLower.includes('mma')) category = 'Mixed Martial Arts';
        else if (titleLower.includes('boxing')) category = 'Boxing';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Scotiabank Arena`,
            date: eventDate,
            venue: {
                name: 'Scotiabank Arena',
                address: '40 Bay St, Toronto, ON M5J 2X2',
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
            console.log(`🏀 Scraping events from ${this.source}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            const eventSelectors = ['.event', '.event-item', '.event-card', '.game', '.concert', '.show', '.listing'];
            
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
                eventElements = $('[class*="event"], [class*="game"], [class*="concert"]');
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

module.exports = ScotiabankArenaEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new ScotiabankArenaEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('SCOTIABANK ARENA TEST RESULTS');
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
