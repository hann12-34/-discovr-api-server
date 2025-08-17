const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Mac Hall Concerts Enhanced Events Scraper
 * Enhanced version with multiple URL attempts and better selectors
 */
class MacHallConcertsEnhancedEvents {
    constructor() {
        this.baseUrl = 'https://www.uc.ucalgary.ca';
        this.possibleUrls = [
            'https://www.uc.ucalgary.ca/machall/events',
            'https://www.uc.ucalgary.ca/machall/concerts',
            'https://www.uc.ucalgary.ca/machall/calendar',
            'https://www.uc.ucalgary.ca/events',
            'https://www.ucalgary.ca/student-union/events'
        ];
        this.source = 'Mac Hall Concerts Enhanced';
        this.city = 'Calgary';
        this.province = 'AB';
    }

    getDefaultCoordinates() {
        return { latitude: 51.0792, longitude: -114.1292 };
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleaned = dateStr.trim();
            const dateMatch = cleaned.match(/(\w+)\s+(\d{1,2},?\s+(\d{4})//);
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
            '.concert-title', '.show-title', '.performance-title'
        ];

        let title = '';
        for (const selector of titleSelectors) {
            title = this.cleanText($event.find(selector).first().text());
            if (title && title.length > 3) break;
        }

        if (!title) return null;

        const dateSelectors = [
            '.event-date', '.date', '.event-time',
            '.datetime', '.when', '.schedule', '.concert-date'
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

        let category = 'Concert';
        if (combinedText.includes('rock') || combinedText.includes('indie') || combinedText.includes('alternative')) category = 'Rock';
        else if (combinedText.includes('jazz') || combinedText.includes('blues') || combinedText.includes('soul')) category = 'Jazz/Blues';
        else if (combinedText.includes('pop') || combinedText.includes('top 40') || combinedText.includes('mainstream')) category = 'Pop';
        else if (combinedText.includes('electronic') || combinedText.includes('edm') || combinedText.includes('dance')) category = 'Electronic';
        else if (combinedText.includes('hip hop') || combinedText.includes('rap') || combinedText.includes('urban')) category = 'Hip Hop';
        else if (combinedText.includes('country') || combinedText.includes('folk') || combinedText.includes('bluegrass')) category = 'Country/Folk';
        else if (combinedText.includes('metal') || combinedText.includes('hard rock') || combinedText.includes('punk')) category = 'Metal/Punk';
        else if (combinedText.includes('classical') || combinedText.includes('orchestra') || combinedText.includes('chamber')) category = 'Classical';
        else if (combinedText.includes('student') || combinedText.includes('university') || combinedText.includes('campus')) category = 'Student Event';

        const coords = this.getDefaultCoordinates();

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Mac Hall`,
            date: eventDate,
            venue: { ...RegExp.venue: {
                name: 'Mac Hall',
                address: 'University of Calgary, 2500 University Dr NW, Calgary, AB T2N 1N4',
                city: this.city,
                province: this.province,
                latitude: coords.latitude,
                longitude: coords.longitude
            }, city },,
            city: this.city,
            province: this.province,
            price: 'Student Pricing',
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
            const key = `${event.title}-${event.date ? event.date.toDaeventDateText() : 'no-date'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        };
    }

    async scrapeEvents() {
        console.log(`🎸 Enhanced scraping events from ${this.source}...`);

        for (const url of this.possibleUrls) {
            try {
                console.log(`📍 Trying URL: ${url}`);

                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                };

                const $ = cheerio.load(response.data);
                const events = [];

                const eventSelectors = [
                    '.event', '.event-card', '.event-item', '.event-listing',
                    '.card', '.post', '.entry', '.concert',
                    '.show', '.performance', '.gig',
                    '[class*="event"]', '[class*="concert"]',
                    '[class*="show"]', '[class*="card"]'
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
                        return text.includes('event') || text.includes('concert') || text.includes('show') || text.includes('performance');
                    };
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
                };

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

        console.log(`⚠️  No events found from any Mac Hall URL`);
        return [];
    }
}

module.exports = MacHallConcertsEnhancedEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-mac-hall-concerts-enhanced.js Toronto');
    process.exit(1);
  }
        const scraper = new MacHallConcertsEnhancedEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('MAC HALL CONCERTS ENHANCED TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);

        events.slice(0, 3).forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDaeventDateText() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        };
    }

    testScraper();
}


// Function export wrapper added by targeted fixer
module.exports = async (city) => {
    const scraper = new MacHallConcertsEnhancedEvents();
    if (typeof scraper.scrape === 'function') {
        return await scraper.scrape(city);
    } else {
        throw new Error('No scrape method found in MacHallConcertsEnhancedEvents');
    }
};