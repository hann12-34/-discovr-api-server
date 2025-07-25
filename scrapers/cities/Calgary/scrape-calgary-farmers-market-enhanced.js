const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Calgary Farmers Market Enhanced Events Scraper
 * Enhanced version with multiple URL attempts and better selectors
 */
class CalgaryFarmersMarketEnhancedEvents {
    constructor() {
        this.baseUrl = 'https://www.calgaryfarmersmarket.ca';
        this.possibleUrls = [
            'https://www.calgaryfarmersmarket.ca/events',
            'https://www.calgaryfarmersmarket.ca/calendar',
            'https://www.calgaryfarmersmarket.ca/special-events',
            'https://www.calgaryfarmersmarket.ca/activities',
            'https://www.calgaryfarmersmarket.ca/whats-on',
            'https://www.calgaryfarmersmarket.ca/vendors-events',
            'https://www.calgaryfarmersmarket.ca/community-events'
        ];
        this.source = 'Calgary Farmers Market Enhanced';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    getDefaultCoordinates() {
        return { latitude: 51.0347, longitude: -114.0719 };
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
            '.market-title', '.vendor-title', '.activity-title'
        ];
        
        let title = '';
        for (const selector of titleSelectors) {
            title = this.cleanText($event.find(selector).first().text());
            if (title && title.length > 3) break;
        }
        
        if (!title) return null;
        
        const dateSelectors = [
            '.event-date', '.date', '.event-time',
            '.datetime', '.when', '.schedule',
            '.market-date', '.vendor-date', '.activity-date'
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
        
        const titleLower = title.toLowerCase();
        const descLower = description.toLowerCase();
        const combinedText = `${titleLower} ${descLower}`;
        
        let category = 'Market Event';
        if (combinedText.includes('farmer') || combinedText.includes('market') || combinedText.includes('vendor')) category = 'Farmers Market';
        else if (combinedText.includes('food') || combinedText.includes('tasting') || combinedText.includes('culinary')) category = 'Food Event';
        else if (combinedText.includes('family') || combinedText.includes('kids') || combinedText.includes('children')) category = 'Family Activity';
        else if (combinedText.includes('craft') || combinedText.includes('artisan') || combinedText.includes('handmade')) category = 'Arts & Crafts';
        else if (combinedText.includes('music') || combinedText.includes('performance') || combinedText.includes('live')) category = 'Music';
        else if (combinedText.includes('seasonal') || combinedText.includes('holiday') || combinedText.includes('celebration')) category = 'Seasonal Event';
        else if (combinedText.includes('workshop') || combinedText.includes('demo') || combinedText.includes('learning')) category = 'Workshop';
        else if (combinedText.includes('community') || combinedText.includes('local') || combinedText.includes('neighborhood')) category = 'Community Event';
        else if (combinedText.includes('organic') || combinedText.includes('sustainable') || combinedText.includes('green')) category = 'Sustainable Living';
        else if (combinedText.includes('flower') || combinedText.includes('garden') || combinedText.includes('plant')) category = 'Gardening';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Calgary Farmers Market`,
            date: eventDate,
            venue: {
                name: 'Calgary Farmers Market',
                address: '510 77 Avenue SE, Calgary, AB T2H 1C3',
                city: this.city,
                province: this.province,
                latitude: coords.latitude,
                longitude: coords.longitude
            },
            city: this.city,
            province: this.province,
            price: 'Free to Enter',
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
        console.log(`🌾 Enhanced scraping events from ${this.source}...`);
        
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
                    '.card', '.post', '.entry', '.activity',
                    '.market-event', '.vendor-event', '.special-event',
                    '[class*="event"]', '[class*="activity"]',
                    '[class*="market"]', '[class*="card"]'
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
                        return text.includes('event') || text.includes('activity') || text.includes('market') || text.includes('vendor');
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
                
            } catch (error) {
                console.log(`❌ Error with URL ${url}:`, error.message);
                continue;
            }
        }
        
        console.log(`⚠️  No events found from any Calgary Farmers Market URL`);
        return [];
    }
}

module.exports = CalgaryFarmersMarketEnhancedEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new CalgaryFarmersMarketEnhancedEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('CALGARY FARMERS MARKET ENHANCED TEST RESULTS');
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
