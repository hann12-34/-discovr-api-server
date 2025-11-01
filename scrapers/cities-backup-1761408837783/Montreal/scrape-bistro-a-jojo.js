const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Bistro A Jojo Events Scraper
 * Scrapes live music events from Bistro A Jojo in Montreal
 */
class BistroAJojoEvents {
    constructor() {
        this.name = 'Bistro A Jojo';
        this.eventsUrl = 'https://www.bistroajojo.com/livemusic';
        this.source = 'bistro-a-jojo';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎵 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Wix site - try comprehensive selectors and fallback to text parsing
            let eventElements = $('.event, .show, .concert, .performance, article, .card, .listing, [data-testid], .comp-text, .text-content, [class*="event"], [class*="show"], [class*="music"]');
            
            // Fallback: parse any text containing dates and music-related keywords
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text();
                    return text.length > 20 && text.length < 500 && 
                           (text.includes('202') || text.includes('Dec') || text.includes('Jan')) &&
                           (text.includes('music') || text.includes('band') || text.includes('concert') || text.includes('show'));
                });
            }
            
            eventElements.each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .artist, .band').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .details, .info').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .when').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Bistro A Jojo`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Bistro A Jojo',
                            address: '1875 Rue Amherst, Montreal, QC H2L 3L4',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5223,
                            longitude: -73.5643
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Live Music',
                        source: this.source,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            console.log(`🎉 Successfully scraped ${events.length} events from ${this.source}`);
            return filterEvents(events);

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            return new Date(dateStr);
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new BistroAJojoEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
