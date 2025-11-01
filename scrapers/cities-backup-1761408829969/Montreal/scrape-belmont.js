const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Belmont Montreal Events Scraper
 * URL: https://belmont.ca
 */
class BelmontEvents {
    constructor() {
        this.baseUrl = 'https://www.lebelmont.ca';
        this.eventsUrl = 'https://www.lebelmont.ca/evenements';
        this.source = 'Belmont';
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
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2})/);
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
            name: 'Belmont',
            address: 'Montreal, QC',
            city: this.city,
            province: 'QC',
            coordinates: this.getDefaultCoordinates()
        };
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        const fullText = $event.text();
        
        // Extract title - look for patterns like "UNDERWATER - LATIN TRAP NIGHT" or "CONCERT DOPELYM A MONTREAL"
        const titleMatch = fullText.match(/([A-Z][A-Z\s\-&+]+)(?:\s*\/\s*Billets|$)/);
        const title = titleMatch ? this.cleanText(titleMatch[1]) : this.cleanText($event.text().split('/')[0]);

        if (!title || title.length < 3) return null;

        // Extract date - look for patterns like "ven. 05 sept." or "sam. 06 sept."
        const dateMatch = fullText.match(/(\w+\.\s*\d{1,2}\s+\w+\.)/);
        const dateText = dateMatch ? dateMatch[1] : '';
        const eventDate = this.parseDate(dateText + ' 2025'); // Assume current year
        
        const description = `${title} at Belmont Montreal`;
        const price = fullText.includes('Billets') ? 'Tickets Available' : 'Check website for pricing';
        
        // Try to extract ticket URL
        const ticketUrl = $event.find('a[href*="tixtree"], a[href*="eventbrite"], a[href*="lepointdevente"], a[href*="admitone"]').attr('href');
        const venue = this.extractVenueInfo();

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description && description.length > 20 ? description : `${title} - ${title} at Belmont`,
            date: eventDate,
            venue: { name: venue, city: 'Montreal' },
            city: this.city,
            province: this.province,
            price: price,
            category: 'Entertainment',
            source: this.source,
            url: ticketUrl || this.eventsUrl,
            scrapedAt: new Date()
        };
    }

    async scrapeEvents() {
        try {
            console.log(`🎯 Scraping events from ${this.source}...`);
            const response = await axios.get(this.eventsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];
            // Look for event containers - Belmont lists events in a specific structure
            let eventElements = $('div:contains("sept."), div:contains("oct."), div:contains("nov."), div:contains("déc.")').filter(function() {
                const text = $(this).text();
                return text.includes('2025') || text.includes('Billets') || text.match(/\d{2}\s+(sept|oct|nov|déc)\./);
            });

            // If no events found with date selectors, try broader approach
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('billets') && (text.includes('2025') || text.match(/\d{2}\s+(sept|oct|nov|déc)/));
                });
            }

            console.log(`✅ Found ${eventElements.length} potential event elements`);

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
            });

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
        const uniqueEvents = [];
        
        for (const event of events) {
            // Create multiple keys to catch different types of duplicates
            const nameKey = event.name.toLowerCase().trim();
            const dateKey = event.date ? event.date.toDateString() : 'no-date';
            const combinedKey = `${nameKey}-${dateKey}`;
            
            // Also check for similar names (remove common variations)
            const normalizedName = nameKey
                .replace(/\s*-\s*/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[^\w\s]/g, '')
                .trim();
            const normalizedKey = `${normalizedName}-${dateKey}`;
            
            // Skip if we've seen this exact event or a very similar version
            if (seen.has(combinedKey) || seen.has(normalizedKey)) {
                continue;
            }
            
            // Skip events that are too short or seem invalid
            if (event.name.length < 3 || event.name.match(/^(ven\.|sam\.|dim\.|lun\.|mar\.|mer\.|jeu\.)?\s*\d/)) {
                continue;
            }
            
            seen.add(combinedKey);
            seen.add(normalizedKey);
            uniqueEvents.push(event);
        }
        
        return uniqueEvents;
    }

    async getEvents(startDate = null, endDate = null) {
        const events = await this.scrapeEvents();
        if (!startDate && !endDate) return filterEvents(events);

        return events.filter(event => {
            if (!event.date) return true;
            const eventDate = new Date(event.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            return true;
        });
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new BelmontEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
