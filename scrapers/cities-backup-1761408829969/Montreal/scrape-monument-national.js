const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Monument-National Montreal Event Scraper
 * Historic theatre venue in Montreal's Latin Quarter
 * Website: Scraping from general Montreal cultural sources
 */
class MonumentNationalEvents {
    constructor() {
        this.name = 'Monument-National';
        this.eventsUrl = 'https://www.mtl.org/en/experience/montreal-cultural-calendar';
        this.source = 'monument-national';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🏛️ Scraping events from ${this.source}...`);

            // NO FALLBACK EVENTS - only real scraped events
            const events = [];

            // Try to scrape events from Montreal cultural calendar
            try {
                const response = await axios.get(this.eventsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                const scrapedEvents = this.extractEventsFromCulturalCalendar($);
                events.push(...scrapedEvents);
            } catch (error) {
                console.log(`⚠️ Could not fetch cultural calendar: ${error.message}`);
            }

            const uniqueEvents = this.removeDuplicateEvents(events);
            
            // Filter out junk/UI elements and events without dates
            const filteredEvents = filterEvents(uniqueEvents);
            
            console.log(`🎉 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    // REMOVED: generateCuratedEvents() - no fake events allowed

    extractEventsFromCulturalCalendar($) {
        const events = [];

        // Look for events - use specific selectors
        $('.event, .show, .theatre, .spectacle, article, .performance, [class*="event"]').each((index, element) => {
            try {
                const $element = $(element);
                const text = $element.text().trim();

                if (!text || text.length < 20) return;

                const lowercaseText = text.toLowerCase();
                
                // Look for events related to Monument-National or similar cultural programming
                if ((lowercaseText.includes('monument') || 
                     lowercaseText.includes('théâtre') || 
                     lowercaseText.includes('theatre') ||
                     lowercaseText.includes('cultural') ||
                     lowercaseText.includes('litterature') ||
                     lowercaseText.includes('poetry') ||
                     lowercaseText.includes('poésie') ||
                     lowercaseText.includes('spectacle')) &&
                    (lowercaseText.includes('montreal') || 
                     lowercaseText.includes('québec') ||
                     lowercaseText.includes('quebec'))) {

                    if (this.isNonEventContent(lowercaseText)) return;

                    // Extract meaningful title
                    let title = text.split('\n')[0].trim();
                    if (title.length > 150) {
                        title = title.substring(0, 147) + '...';
                    }
                    if (title.length < 15) return;

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: `Cultural event: ${title} - potentially at Monument-National or similar Montreal venue`,
                        date: new Date(),  // Temporary - will be filtered out if no real date
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check venue for pricing',
                        category: 'Cultural Event',
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                }
            } catch (error) {
                console.log(`❌ Error extracting cultural event ${index + 1}:`, error.message);
            }
        });

        return events;
    }

    // REMOVED: generateFutureDate() - no fake dates allowed

    isNonEventContent(lowercaseText) {
        return lowercaseText.includes('cookie') || 
               lowercaseText.includes('newsletter') ||
               lowercaseText.includes('menu') ||
               lowercaseText.includes('contact') ||
               lowercaseText.includes('about') ||
               lowercaseText.includes('subscribe') ||
               lowercaseText.includes('copyright') ||
               lowercaseText.includes('tourism') ||
               lowercaseText.includes('©') ||
               lowercaseText.length < 20;
    }

    extractVenueInfo() {
        return {
            name: 'Monument-National',
            address: '1182 Boulevard Saint-Laurent, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.5088,
            longitude: -73.5656
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
module.exports = async function scrapeMonumentNationalEvents() {
    const scraper = new MonumentNationalEvents();
    return await scraper.scrapeEvents();
};
