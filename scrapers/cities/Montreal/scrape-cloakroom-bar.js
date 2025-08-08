const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Cloakroom Bar Montreal Events Scraper
 * URL: https://cloakroombar.ca
 */
class CloakroomBarEvents {
    constructor() {
        this.baseUrl = 'https://cloakroombar.ca';
        this.eventsUrl = 'https://cloakroombar.ca/events';
        this.source = 'Cloakroom Bar';
        this.city = 'Montreal';
        this.province = 'QC';
    }

    getDefaultCoordinates() {
        return { latitude: 45.5088, longitude: -73.5878 };
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2}/);
            if (isoMatch) return new Date(isoMatch[1]);

            const frenchMonths = {
                'janvier': 'January', 'février': 'February', 'mars': 'March',
                'avril': 'April', 'mai': 'May', 'juin': 'June',
                'juillet': 'July', 'août': 'August', 'septembre': 'September',
                'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
            };

            let englishDateStr = cleanDateStr;
            for (const [french, english] of Object.entries(frenchMonths)) {
                englishDateStr = englishDateStr.replace(new RegExp(french, 'gi'), english);
            }

            const parsedDate = new Date(englishDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    }

    extractVenueInfo() {
        return {
            name: 'Cloakroom Bar',
            address: 'Montreal, QC',
            city: city,
            province: 'QC',
            coordinates: this.getDefaultCoordinates()
        };
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        const title = this.cleanText($event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text() || $event.find('a').first().text());

        if (!title || title.length < 3) return null;

        const dateText = $event.find('.date, .event-date, .when, time').first().text();
        const eventDate = this.parseDate(dateText);
        const description = this.cleanText($event.find('.description, .summary, .excerpt, p').first().text());
        const priceText = $event.find('.price, .cost, .ticket-price').text();
        const price = priceText ? this.cleanText(priceText) : 'Check website for pricing';
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        const venue = this.extractVenueInfo();

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Cloakroom Bar`,
            date: eventDate,
            venue: { ...RegExp.venue: { ...RegExp.venue: venue,, city }, city },,
            city: this.city,
            province: this.province,
            price: price,
            category: 'Nightlife',
            source: this.source,
            url: fullEventUrl,
            scrapedAt: new Date()
        };
    }

    async scrapeEvents() {
        try {
            console.log(`🍸 Scraping events from ${this.source}...`);
            const response = await axios.get(this.eventsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                timeout: 30000
            };

            const $ = cheerio.load(response.data);
            const events = [];
            const eventSelectors = ['.event', '.event-item', '.event-card', '.show', '.party', '.listing', '.card'];

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
                eventElements = $('[class*="event"], [class*="show"], [class*="party"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('2024') || text.includes('2025') || text.includes('party') || text.includes('show');
                };
            }

            eventElements.each((index, element) => {
                try {
                    const eventData = this.extractEventDetails($, element);
                    if (eventData && eventData.name) {
                        events.push(eventData);
                        console.log(`✅ Extracted: ${eventData.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            };

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} unique events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name}-${event.date}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        };
    }

    async getEvents(startDate = null, endDate = null) {
        const events = await this.scrapeEvents();
        if (!startDate && !endDate) return events;

        return events.filter(event => {
            if (!event.date) return true;
            const eventDate = new Date(event.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            return true;
        };
    }
}

module.exports = CloakroomBarEvents;


// Function export wrapper added by targeted fixer
module.exports = async (city) => {
    const scraper = new CloakroomBarEvents();
    if (typeof scraper.scrape === 'function') {
        return await scraper.scrape(city);
    } else {
        throw new Error('No scrape method found in CloakroomBarEvents');
    }
};