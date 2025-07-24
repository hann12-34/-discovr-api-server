const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Calgary Public Library Enhanced Events Scraper
 * Enhanced version with multiple URL attempts and better selectors
 */
class CalgaryPublicLibraryEnhancedEvents {
    constructor() {
        this.baseUrl = 'https://www.calgarylibrary.ca';
        this.possibleUrls = [
            'https://www.calgarylibrary.ca/events-and-programs',
            'https://www.calgarylibrary.ca/events',
            'https://www.calgarylibrary.ca/programs',
            'https://www.calgarylibrary.ca/calendar',
            'https://www.calgarylibrary.ca/activities'
        ];
        this.source = 'Calgary Public Library Enhanced';
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
            '.program-title', '.activity-title', '.workshop-title'
        ];
        
        let title = '';
        for (const selector of titleSelectors) {
            title = this.cleanText($event.find(selector).first().text());
            if (title && title.length > 3) break;
        }
        
        if (!title) return null;
        
        const dateSelectors = [
            '.event-date', '.date', '.event-time',
            '.datetime', '.when', '.schedule', '.program-date'
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
        
        let category = 'Library Event';
        if (combinedText.includes('kids') || combinedText.includes('children') || combinedText.includes('family')) category = 'Children & Family';
        else if (combinedText.includes('book') || combinedText.includes('reading') || combinedText.includes('author')) category = 'Book Club';
        else if (combinedText.includes('computer') || combinedText.includes('tech') || combinedText.includes('digital')) category = 'Technology';
        else if (combinedText.includes('workshop') || combinedText.includes('class') || combinedText.includes('learn')) category = 'Workshop';
        else if (combinedText.includes('story') || combinedText.includes('storytelling') || combinedText.includes('storytime')) category = 'Storytelling';
        else if (combinedText.includes('craft') || combinedText.includes('art') || combinedText.includes('creative')) category = 'Arts & Crafts';
        else if (combinedText.includes('senior') || combinedText.includes('adult') || combinedText.includes('older')) category = 'Adult Programs';
        else if (combinedText.includes('teen') || combinedText.includes('youth') || combinedText.includes('young')) category = 'Teen Programs';
        else if (combinedText.includes('lecture') || combinedText.includes('presentation') || combinedText.includes('talk')) category = 'Educational Talk';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Calgary Public Library`,
            date: eventDate,
            venue: {
                name: 'Calgary Public Library',
                address: 'Various Calgary Library Locations',
                city: this.city,
                province: this.province,
                latitude: coords.latitude,
                longitude: coords.longitude
            },
            city: this.city,
            province: this.province,
            price: 'Free',
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
        console.log(`📚 Enhanced scraping events from ${this.source}...`);
        
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
                    '.card', '.post', '.entry', '.program',
                    '.activity', '.workshop', '.class',
                    '[class*="event"]', '[class*="program"]',
                    '[class*="activity"]', '[class*="card"]'
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
                        return text.includes('event') || text.includes('program') || text.includes('activity') || text.includes('workshop');
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
        
        console.log(`⚠️  No events found from any Calgary Public Library URL`);
        return [];
    }
}

module.exports = CalgaryPublicLibraryEnhancedEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new CalgaryPublicLibraryEnhancedEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('CALGARY PUBLIC LIBRARY ENHANCED TEST RESULTS');
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
