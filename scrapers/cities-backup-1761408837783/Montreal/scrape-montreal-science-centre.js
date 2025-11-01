const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Science Centre Events Scraper
 * Scrapes events from Montreal Science Centre
 * URL: https://montrealsciencecentre.com
 */
class MontrealScienceCentreEvents {
    constructor() {
        this.baseUrl = 'https://www.montrealsciencecentre.com';
        this.eventsUrl = 'https://www.montrealsciencecentre.com/special-events';
        this.source = 'Montreal Science Centre';
        this.city = 'Montreal';
        this.province = 'QC';
        this.isEnabled = true; // Science centre events are educational
    }

    /**
     * Parse date from various formats
     * @param {string} dateStr - Date string to parse
     * @returns {Date} Parsed date
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        try {
            const cleanDateStr = dateStr.trim();

            // Handle ISO date format
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return new Date(isoMatch[1]);
            }

            // Handle French date formats
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
            console.error('Error parsing date:', dateStr, error);
            return null;
        }
    }

    /**
     * Clean and standardize text
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        if (!text) return '';
        return text.trim()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .replace(/\t+/g, ' ')
            .trim();
    }

    /**
     * Extract venue information
     * @returns {Object} Venue information
     */
    extractVenueInfo() {
        return {
            name: 'Montreal Science Centre',
            address: '2 Rue de la Commune O, Montreal, QC H2Y 4B2',
            city: 'Montreal',
            province: 'QC',
            latitude: 45.5016,
            longitude: -73.5650
        };
    }

    /**
     * Filter events for live events only (today or future)
     * @param {Array} events - Array of events to filter
     * @returns {Array} Filtered events
     */
    filterLiveEvents(events) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return events.filter(event => {
            if (!event.date) return true; // Include events without dates
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });
    }

    /**
     * Remove duplicate events based on title and date
     * @param {Array} events - Array of events
     * @returns {Array} Unique events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title.toLowerCase()}-${event.date ? event.date.toDateString() : 'no-date'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Scrape events from Montreal Science Centre
     * @returns {Array} Array of event objects
     */
    async scrapeEvents() {
        if (!this.isEnabled) {
            console.log('🚫 Montreal Science Centre scraper is disabled');
            return [];
        }

        try {
            console.log(`🔬 Scraping events from ${this.source}...`);

            const events = [];

            // Try to scrape live events from website
            try {
                const response = await axios.get(this.eventsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                
                // Look for special events
                const liveEvents = [];
                $('a[href*="special-event"], a[href*="event"]').each((i, element) => {
                    const $link = $(element);
                    const href = $link.attr('href');
                    const linkText = this.cleanText($link.text());

                    if (linkText && linkText.length > 3 && !linkText.toLowerCase().includes('more')) {
                        // Extract date from text if available
                        const dateMatch = linkText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\.]?\s*(\d{1,2})[\s,]*(\d{4})?/i);
                        const eventDate = dateMatch ? this.parseDate(dateMatch[0]) : null;

                        // Clean title
                        let title = linkText.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\.]?\s*(\d{1,2}[\s,]*\d{4})?/i, '').trim();
                        
                        if (title && title.length > 3) {
                            liveEvents.push({
                                id: uuidv4(),
                                title: title,
                                description: `Special event at ${this.source}`,
                                date: eventDate,
                                venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                                city: this.city,
                                province: this.province,
                                price: 'Check website for pricing',
                                category: 'Science & Education',
                                source: this.source,
                                url: href && href.startsWith('http') ? href : `${this.baseUrl}${href || ''}`,
                                image: null,
                                scrapedAt: new Date()
                            });
                        }
                    }
                });

                events.push(...liveEvents);
            } catch (webError) {
                console.log('Could not scrape live events, using static events only');
            }

            // Filter and deduplicate
            const uniqueEvents = this.removeDuplicateEvents(events);
            const filteredEvents = this.filterLiveEvents(uniqueEvents);

            console.log(`🎉 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new MontrealScienceCentreEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;



