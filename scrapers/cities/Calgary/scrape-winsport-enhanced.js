const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * WinSport Enhanced Events Scraper
 * Enhanced version with multiple URL attempts and better selectors
 */
class WinSportEnhancedEvents {
    constructor() {
        this.baseUrl = 'https://www.winsport.ca';
        this.possibleUrls = [
            'https://www.winsport.ca/events',
            'https://www.winsport.ca/calendar',
            'https://www.winsport.ca/activities',
            'https://www.winsport.ca/things-to-do',
            'https://www.winsport.ca/programs',
            'https://www.winsport.ca/what-s-on',
            'https://www.winsport.ca/competitions'
        ];
        this.source = 'WinSport Enhanced';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    getDefaultCoordinates() {
        return { latitude: 51.0946, longitude: -114.2071 };
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
            '.activity-title', '.program-title', '.sport-title'
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
            '.activity-date', '.program-date', '.sport-date'
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
        
        let category = 'Sports Event';
        if (combinedText.includes('ski') || combinedText.includes('skiing') || combinedText.includes('snowboard')) category = 'Winter Sports';
        else if (combinedText.includes('hockey') || combinedText.includes('ice') || combinedText.includes('arena')) category = 'Ice Sports';
        else if (combinedText.includes('bike') || combinedText.includes('cycling') || combinedText.includes('mountain')) category = 'Mountain Biking';
        else if (combinedText.includes('tube') || combinedText.includes('tubing') || combinedText.includes('sledding')) category = 'Tubing';
        else if (combinedText.includes('fitness') || combinedText.includes('training') || combinedText.includes('workout')) category = 'Fitness';
        else if (combinedText.includes('camp') || combinedText.includes('lesson') || combinedText.includes('class')) category = 'Lessons/Camps';
        else if (combinedText.includes('race') || combinedText.includes('competition') || combinedText.includes('championship')) category = 'Competition';
        else if (combinedText.includes('family') || combinedText.includes('kids') || combinedText.includes('children')) category = 'Family Activity';
        else if (combinedText.includes('event') || combinedText.includes('special') || combinedText.includes('celebration')) category = 'Special Event';
        else if (combinedText.includes('bobsled') || combinedText.includes('luge') || combinedText.includes('skeleton')) category = 'Sliding Sports';
        
        const coords = this.getDefaultCoordinates();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at WinSport`,
            date: eventDate,
            venue: {
                name: 'WinSport',
                address: '88 Canada Olympic Road SW, Calgary, AB T3B 5R5',
                city: this.city,
                province: this.province,
                latitude: coords.latitude,
                longitude: coords.longitude
            },
            city: this.city,
            province: this.province,
            price: 'Paid',
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
        console.log(`🎿 Enhanced scraping events from ${this.source}...`);
        
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
                    '.program', '.sport', '.competition',
                    '[class*="event"]', '[class*="activity"]',
                    '[class*="program"]', '[class*="card"]'
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
                        return text.includes('event') || text.includes('activity') || text.includes('program') || text.includes('sport');
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
        
        console.log(`⚠️  No events found from any WinSport URL`);
        return [];
    }
}

module.exports = WinSportEnhancedEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new WinSportEnhancedEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('WINSPORT ENHANCED TEST RESULTS');
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
