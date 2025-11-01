const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Centaur Theatre Montreal Event Scraper
 * English-language theatre in Montreal's Old Port
 * Website: https://centaurtheatre.com
 */
class CentaurTheatreEvents {
    constructor() {
        this.name = 'Centaur Theatre';
        this.eventsUrl = 'https://centaurtheatre.com/whats-on/';
        this.seasonUrl = 'https://centaurtheatre.com/prices-subscriptions/';
        this.source = 'centaur-theatre';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎭 Scraping events from ${this.source}...`);

            const events = [];
            
            // Try to scrape from What's On page
            try {
                const response = await axios.get(this.eventsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                const scrapedEvents = this.extractEventsFromWhatsOn($);
                events.push(...scrapedEvents);
            } catch (error) {
                console.log(`⚠️ Could not fetch What's On page: ${error.message}`);
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

    extractEventsFromWhatsOn($) {
        const events = [];

        // Look for theatre events - use specific selectors
        $('.event, .show, .performance, .play, article, .theatre-event, [class*="event"]').each((index, element) => {
            try {
                const $element = $(element);
                const text = $element.text().trim();

                if (!text || text.length < 15) return;

                const lowercaseText = text.toLowerCase();
                
                // Look for theatre event indicators
                if ((lowercaseText.includes('show') || 
                     lowercaseText.includes('play') || 
                     lowercaseText.includes('production') ||
                     lowercaseText.includes('performance') ||
                     lowercaseText.includes('theatre') ||
                     lowercaseText.includes('season') ||
                     lowercaseText.includes('drama')) &&
                    (lowercaseText.includes('2025') || 
                     lowercaseText.includes('2026') ||
                     lowercaseText.includes('featured'))) {

                    if (this.isNonEventContent(lowercaseText)) return;

                    // Extract meaningful title
                    let title = text.split('\n')[0].trim();
                    if (title.length > 150) {
                        title = title.substring(0, 147) + '...';
                    }
                    if (title.length < 10) return;

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: `Theatre production: ${title} at Centaur Theatre Montreal`,
                        date: new Date(),  // Will be filtered out if no real date
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check theatre for pricing',
                        category: 'Theatre',
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                }
            } catch (error) {
                console.log(`❌ Error extracting What's On event ${index + 1}:`, error.message);
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
               lowercaseText.includes('donate') ||
               lowercaseText.includes('box office') ||
               lowercaseText.includes('privacy policy') ||
               lowercaseText.includes('registered charitable') ||
               lowercaseText.includes('all rights reserved') ||
               lowercaseText.includes('514-288') ||
               lowercaseText.includes('©') ||
               lowercaseText.length < 20;
    }

    extractVenueInfo() {
        return {
            name: 'Centaur Theatre',
            address: '453 Rue Saint-François-Xavier, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.5007,
            longitude: -73.5551
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
module.exports = async function scrapeCentaurTheatreEvents() {
    const scraper = new CentaurTheatreEvents();
    return await scraper.scrapeEvents();
};
