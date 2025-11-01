const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * L'Astral Montreal Event Scraper
 * Concert venue in Montreal
 * Website: Via Songkick and other sources
 */
class LAstralEvents {
    constructor() {
        this.name = "L'Astral";
        this.eventsUrl = 'https://www.songkick.com/venues/624766-lastral';
        this.source = 'lastral';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎼 Scraping events from ${this.source}...`);

            const events = [];
            
            // Try to scrape from Songkick
            try {
                const response = await axios.get(this.eventsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                const scrapedEvents = this.extractEventsFromSongkick($);
                events.push(...scrapedEvents);
            } catch (error) {
                console.log(`⚠️ Could not fetch from Songkick: ${error.message}`);
            }

            // NO FALLBACK EVENTS - only return real scraped events
            const uniqueEvents = this.removeDuplicateEvents(events);
            
            // Filter out junk/UI elements
            const filteredEvents = filterEvents(uniqueEvents);
            
            console.log(`🎉 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    extractEventsFromSongkick($) {
        const events = [];

        // Look for concert listings on Songkick - use specific selectors
        $('.event, .concert, article, .show, .performance, [class*="event"]').each((index, element) => {
            try {
                const $element = $(element);
                const text = $element.text().trim();

                if (!text || text.length < 10) return;

                const lowercaseText = text.toLowerCase();
                
                // Look for concert/music event indicators
                if ((lowercaseText.includes('concert') || 
                     lowercaseText.includes('show') || 
                     lowercaseText.includes('tour') ||
                     lowercaseText.includes('artist') ||
                     lowercaseText.includes('band') ||
                     lowercaseText.includes('music')) &&
                    (lowercaseText.includes('2025') || 
                     lowercaseText.includes('2026') ||
                     lowercaseText.includes('upcoming'))) {

                    if (this.isNonEventContent(lowercaseText)) return;

                    // Extract meaningful title
                    let title = text.split('\n')[0].trim();
                    if (title.length > 150) {
                        title = title.substring(0, 147) + '...';
                    }
                    if (title.length < 10) return;

                    // Try to extract real date from element
                    const dateText = $element.find('.date, time, .when, [datetime]').text().trim();
                    const parsedDate = dateText ? new Date(dateText) : null;
                    
                    // Skip events without real dates - NO FAKE DATES
                    if (!parsedDate || isNaN(parsedDate.getTime())) return;
                    
                    const eventData = {
                        id: uuidv4(),
                        name: `${title} at L'Astral`,
                        title: `${title} at L'Astral`,
                        description: `Concert: ${title} at L'Astral Montreal`,
                        date: parsedDate,
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check venue for pricing',
                        category: 'Concert',
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                }
            } catch (error) {
                console.log(`❌ Error extracting Songkick event ${index + 1}:`, error.message);
            }
        });

        return events;
    }

    // REMOVED: generateCuratedEvents() - no fake events allowed
    // REMOVED: generateFutureDate() - no fake dates allowed

    isNonEventContent(lowercaseText) {
        return lowercaseText.includes('cookie') || 
               lowercaseText.includes('newsletter') ||
               lowercaseText.includes('menu') ||
               lowercaseText.includes('contact') ||
               lowercaseText.includes('about') ||
               lowercaseText.includes('subscribe') ||
               lowercaseText.includes('discover all') ||
               lowercaseText.includes('songkick') ||
               lowercaseText.includes('wide range') ||
               lowercaseText.includes('©') ||
               lowercaseText.length < 15;
    }

    extractVenueInfo() {
        return {
            name: "L'Astral",
            address: '305 Rue Sainte-Catherine O, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.5058,
            longitude: -73.5735
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
module.exports = async function scrapeLAstralEvents() {
    const scraper = new LAstralEvents();
    return await scraper.scrapeEvents();
};
