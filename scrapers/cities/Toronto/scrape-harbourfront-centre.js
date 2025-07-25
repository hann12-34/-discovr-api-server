const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Harbourfront Centre Toronto Events Scraper
 * URL: https://harbourfrontcentre.com/events/
 */
class HarbourfrontCentreEvents {
    constructor() {
        this.baseUrl = 'https://harbourfrontcentre.com';
        this.eventsUrl = 'https://harbourfrontcentre.com/events/';
        this.source = 'Harbourfront Centre';
        this.city = 'Toronto';
        this.province = 'ON';
    }

    getDefaultCoordinates() {
        return { latitude: 43.6387, longitude: -79.3816 };
    }

    extractCategory(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        
        if (text.includes('dance') || text.includes('bachata') || text.includes('music') || text.includes('concert')) {
            return 'Music & Dance';
        }
        if (text.includes('art') || text.includes('gallery') || text.includes('exhibition')) {
            return 'Art';
        }
        if (text.includes('theatre') || text.includes('drama') || text.includes('play')) {
            return 'Theatre';
        }
        if (text.includes('festival') || text.includes('celebration')) {
            return 'Festival';
        }
        if (text.includes('workshop') || text.includes('class') || text.includes('learn')) {
            return 'Education';
        }
        if (text.includes('film') || text.includes('movie') || text.includes('cinema')) {
            return 'Film';
        }
        if (text.includes('food') || text.includes('culinary') || text.includes('dining')) {
            return 'Food & Drink';
        }
        if (text.includes('family') || text.includes('kids') || text.includes('children')) {
            return 'Family';
        }
        
        return 'Cultural';
    }

    extractPrice(text) {
        if (!text) return 'Contact for pricing';
        
        text = text.toLowerCase();
        
        if (text.includes('free') || text.includes('no charge') || text.includes('complimentary')) {
            return 'Free';
        }
        
        if (text.includes('donation') || text.includes('pay what you can')) {
            return 'By donation';
        }
        
        // Look for price patterns
        const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
            return `$${priceMatch[1]}`;
        }
        
        return 'Contact for pricing';
    }

    normalizeUrl(url, baseUrl = 'https://harbourfrontcentre.com') {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    parseDateAndTime(dateText, timeText = '') {
        if (!dateText) return null;
        
        try {
            dateText = dateText.trim();
            timeText = timeText ? timeText.trim() : '';
            
            // Remove day of week if present
            dateText = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, '');
            
            let startDate, endDate;
            
            // Handle date ranges
            if (dateText.includes('–') || dateText.includes('-')) {
                const parts = dateText.split(/\s*[–-]\s*/);
                if (parts.length === 2) {
                    const [startPart, endPart] = parts;
                    
                    try {
                        startDate = new Date(startPart);
                        endDate = new Date(endPart);
                        
                        // If endDate is invalid, try combining start month/year with end day
                        if (isNaN(endDate.getTime())) {
                            const startDateObj = new Date(startPart);
                            const endDay = parseInt(endPart.match(/\d+/)?.[0]);
                            if (endDay && !isNaN(startDateObj.getTime())) {
                                endDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), endDay);
                            }
                        }
                    } catch (e) {
                        startDate = new Date(startPart);
                        endDate = new Date(endPart);
                    }
                }
            } else {
                // Single date
                startDate = new Date(dateText);
                endDate = startDate;
            }
            
            // Apply time if provided
            if (timeText && !isNaN(startDate.getTime())) {
                const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
                if (timeMatch) {
                    let hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2] || '0');
                    const ampm = timeMatch[3]?.toUpperCase();
                    
                    if (ampm === 'PM' && hours !== 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    
                    startDate.setHours(hours, minutes, 0, 0);
                    if (endDate && endDate !== startDate) {
                        endDate.setHours(hours, minutes, 0, 0);
                    }
                }
            }
            
            return {
                startDate: isNaN(startDate.getTime()) ? null : startDate,
                endDate: isNaN(endDate.getTime()) ? null : endDate
            };
        } catch (error) {
            console.error('Date parsing error:', error);
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    }

    extractVenueInfo() {
        return {
            name: 'Harbourfront Centre',
            address: '235 Queens Quay W, Toronto, ON M5J 2G8',
            city: 'Toronto',
            province: 'ON',
            coordinates: this.getDefaultCoordinates()
        };
    }

    isLiveEvent(eventDate) {
        if (!eventDate) return false;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return eventDate >= today;
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        // Extract title
        const title = this.cleanText(
            $event.find('h1, h2, h3, h4, .title, .event-title').first().text() ||
            $event.find('a').first().text() ||
            $event.text().split('\n')[0]
        );
        
        if (!title || title.length < 3) return null;
        
        // Extract date and time
        const dateText = $event.find('.date, .event-date, .when, time').first().text();
        const timeText = $event.find('.time, .event-time').first().text();
        
        const dateInfo = this.parseDateAndTime(dateText, timeText);
        const eventDate = dateInfo?.startDate;
        
        // Only include live/future events
        if (!this.isLiveEvent(eventDate)) {
            return null;
        }
        
        const description = this.cleanText(
            $event.find('.description, .event-description, .excerpt, p').first().text()
        );
        
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = this.normalizeUrl(eventUrl);
        
        const priceText = $event.find('.price, .cost, .fee').first().text();
        const price = this.extractPrice(priceText);
        
        const venue = this.extractVenueInfo();
        const category = this.extractCategory(title, description);
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Harbourfront Centre`,
            date: eventDate,
            venue: venue,
            city: this.city,
            province: this.province,
            price: price,
            category: category,
            source: this.source,
            url: fullEventUrl,
            scrapedAt: new Date()
        };
    }

    async scrapeEvents() {
        console.log(`🔍 Scraping ${this.source} events...`);
        
        try {
            const response = await axios.get(this.eventsUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EventScraper/1.0)'
                }
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Multiple selectors for different event layouts
            const eventSelectors = [
                '.event-item',
                '.event-card',
                '.event',
                '.calendar-event',
                '.upcoming-event',
                'article',
                '.post',
                '.card',
                '.event-listing'
            ];
            
            for (const selector of eventSelectors) {
                const eventElements = $(selector);
                if (eventElements.length > 0) {
                    console.log(`📅 Found ${eventElements.length} potential events with selector: ${selector}`);
                    
                    eventElements.each((index, element) => {
                        const eventData = this.extractEventDetails($, element);
                        if (eventData) {
                            events.push(eventData);
                        }
                    });
                    
                    if (events.length > 0) break;
                }
            }
            
            // If no events found with standard selectors, try alternative approach
            if (events.length === 0) {
                console.log('🔍 Trying alternative event extraction...');
                
                // Look for any links to event pages
                const eventLinks = $('a[href*="/event"], a[href*="/performance"], a[href*="/show"]');
                if (eventLinks.length > 0) {
                    console.log(`📅 Found ${eventLinks.length} potential event links`);
                    
                    eventLinks.each((index, element) => {
                        const $link = $(element);
                        const title = this.cleanText($link.text());
                        const url = this.normalizeUrl($link.attr('href'));
                        
                        if (title && title.length > 3) {
                            const eventData = {
                                id: uuidv4(),
                                name: title,
                                title: title,
                                description: `${title} at Harbourfront Centre`,
                                date: null, // Will be populated from individual page if needed
                                venue: this.extractVenueInfo(),
                                city: this.city,
                                province: this.province,
                                price: 'Contact for pricing',
                                category: this.extractCategory(title, ''),
                                source: this.source,
                                url: url,
                                scrapedAt: new Date()
                            };
                            
                            events.push(eventData);
                        }
                    });
                }
            }
            
            console.log(`✅ Successfully scraped ${events.length} events from ${this.source}`);
            return events;
            
        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}

module.exports = HarbourfrontCentreEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new HarbourfrontCentreEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('HARBOURFRONT CENTRE EVENTS TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);
        
        events.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDateString() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Price: ${event.price}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        });
    }
    
    testScraper();
}
