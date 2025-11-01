const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Casa Del Popolo Montreal Event Scraper
 * Independent music venue and cultural space in Montreal
 * Website: https://www.casadelpopolo.com (via Bandsintown)
 */
class CasaDelPopoloEvents {
    constructor() {
        this.name = 'Casa Del Popolo';
        this.eventsUrl = 'https://www.bandsintown.com/v/10002014-casa-del-popolo';
        this.source = 'casa-del-popolo';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎸 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for Casa Del Popolo concert listings on Bandsintown
            $('a[href*="bandsintown.com/e/"], .event, .show, .artist, .concert, h2, h3, h4, .title').each((index, element) => {
                try {
                    const $element = $(element);
                    let title = $element.find('h1, h2, h3, h4, .title, .name, .artist-name').first().text().trim() ||
                                $element.text().trim();
                    
                    if (!title || title.length < 3 || title.length > 200) return;
                    
                    // Filter out common non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe') ||
                        lowercaseTitle.includes('casa del popolo') ||
                        lowercaseTitle.includes('upcoming concerts') ||
                        lowercaseTitle.includes('fan reviews') ||
                        lowercaseTitle.includes('nearby venues') ||
                        lowercaseTitle.includes('frequently asked') ||
                        lowercaseTitle.includes('discover more') ||
                        lowercaseTitle.includes('what\'s the best') ||
                        lowercaseTitle.includes('which artists') ||
                        lowercaseTitle.includes('what can i expect') ||
                        lowercaseTitle.includes('what other concert') ||
                        lowercaseTitle.includes('©') ||
                        title.length < 5) return;

                    // Clean up artist names
                    title = this.cleanArtistName(title);
                    if (!title || title.length < 3) return;

                    // Try to extract real date
                    const dateText = $element.find('.date, .event-date, .show-date, time, .when').first().text().trim() ||
                                     $element.closest('article, .event, .show').find('.date, .event-date, .show-date, time, .when').first().text().trim();
                    const parsedDate = dateText ? new Date(dateText) : null;
                    
                    // Skip events without real dates - NO FAKE DATES
                    if (!parsedDate || isNaN(parsedDate.getTime())) return;
                    
                    const eventData = {
                        id: uuidv4(),
                        name: `${title} at Casa Del Popolo`,
                        title: `${title} at Casa Del Popolo`,
                        description: `Live music performance by ${title} at Casa Del Popolo Montreal`,
                        date: parsedDate,
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check venue for pricing',
                        category: 'Live Music',
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            
            // Filter out junk/UI elements
            const filteredEvents = filterEvents(uniqueEvents);
            
            console.log(`🎉 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

        } catch (error) {            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    cleanArtistName(name) {
        // Remove common prefixes/suffixes that aren't part of artist names
        return name.replace(/^(at\s+casa\s+del\s+popolo|live\s+at|concert\s+at)\s*/i, '')
                   .replace(/\s*(tickets|tour|live|concert)\s*$/i, '')
                   .trim();
    }

    // REMOVED: generateFutureDate() - no fake dates allowed

    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Handle various date formats
            const cleanDate = dateString.replace(/[^\w\s\-\/:.]/g, '').trim();
            
            const parsedDate = new Date(cleanDate);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
                return parsedDate;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    extractVenueInfo() {
        return {
            name: 'Casa Del Popolo',
            address: '4873 Boulevard Saint-Laurent, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.5267,
            longitude: -73.5859
        };
    }

    isEventLive(eventDate) {
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        return eventDate >= now && eventDate <= oneYearFromNow;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase()}-${event.date.toDateString()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export the scraper function
module.exports = async function scrapeCasaDelPopoloEvents() {
    const scraper = new CasaDelPopoloEvents();
    return await scraper.scrapeEvents();
};
