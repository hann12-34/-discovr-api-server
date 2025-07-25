const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Eventbrite Calgary Events Scraper
 * Scrapes events from Eventbrite Calgary
 */
class EventbriteCalgaryEvents {
    constructor() {
        this.baseUrl = 'https://www.eventbrite.ca';
        this.eventsUrl = 'https://www.eventbrite.ca/d/canada--calgary/events/';
        this.source = 'Eventbrite Calgary';
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
        const title = this.cleanText($event.find('[data-testid="event-title"], .event-card__title, .event-title, h3, h2, h1').first().text());
        
        if (!title) return null;
        
        const dateText = $event.find('[data-testid="event-date"], .event-card__date, .event-date, .date').first().text();
        const eventDate = this.parseDate(dateText);
        const description = this.cleanText($event.find('.event-card__description, .event-description, p').first().text());
        const price = this.cleanText($event.find('[data-testid="event-price"], .event-card__price, .price').text()) || 'Check website for pricing';
        
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        const titleLower = title.toLowerCase();
        let category = 'General Event';
        if (titleLower.includes('concert') || titleLower.includes('music')) category = 'Concert';
        else if (titleLower.includes('workshop') || titleLower.includes('class')) category = 'Workshop';
        else if (titleLower.includes('festival')) category = 'Festival';
        else if (titleLower.includes('comedy')) category = 'Comedy';
        else if (titleLower.includes('art') || titleLower.includes('gallery')) category = 'Art';
        else if (titleLower.includes('food') || titleLower.includes('drink')) category = 'Food & Drink';
        else if (titleLower.includes('business') || titleLower.includes('networking')) category = 'Business';
        else if (titleLower.includes('fitness') || titleLower.includes('health')) category = 'Health & Fitness';
        else if (titleLower.includes('tech') || titleLower.includes('startup')) category = 'Technology';
        else if (titleLower.includes('charity') || titleLower.includes('fundraiser')) category = 'Charity';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} in Calgary`,
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
                '.card-container',
                '.event'
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
                eventElements = $('[class*="event"], [class*="card"]');
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

module.exports = EventbriteCalgaryEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new EventbriteCalgaryEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('EVENTBRITE CALGARY TEST RESULTS');
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
