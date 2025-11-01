const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Foufounes Électriques Events Scraper
 * Scrapes events from Foufounes Électriques in Montreal
 */
class FoufounesElectriquesEvents {
    constructor() {
        this.name = 'Foufounes Électriques';
        this.eventsUrl = 'https://www.foufouneselectriques.com/en/events/';
        this.source = 'foufounes-electriques';
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

            // Look for event elements with comprehensive selectors
            $('.event, .show, .concert, .party, article, .card, .listing, .event-item, .spectacle, .evenement, .calendar-event, .upcoming-event, [data-event], .wp-block-group, .entry, .post-item, h1, h2, h3, h4, .wp-block-heading, .event-card').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .event-title, .name, .event-name, .show-title').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 150) return;
                    
                    // Filter out non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe')) return;

                    const description = $(element).find('p, .description, .details, .excerpt').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .event-date').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Foufounes Électriques`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Foufounes Électriques',
                            address: '87 Rue Sainte-Catherine E, Montreal, QC H2X 1K5',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5161,
                            longitude: -73.5588
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Music',
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

            const uniqueEvents = [...new Set(events.map(event => JSON.stringify(event)))].map(event => JSON.parse(event));

            // Filter out junk/UI elements
            const filteredEvents = filterEvents(uniqueEvents);
            
            console.log(`🎉 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

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
  const scraper = new FoufounesElectriquesEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
