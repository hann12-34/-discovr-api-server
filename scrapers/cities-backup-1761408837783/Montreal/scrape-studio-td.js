const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Le Studio TD Event Scraper
 * Concert hall in Montreal's Quartier des spectacles (formerly L'Astral)
 * Website: https://lestudiotd.com/en
 */
class StudioTDEvents {
    constructor() {
        this.name = 'Le Studio TD';
        this.eventsUrl = 'https://lestudiotd.com/en/events?display=grid';
        this.source = 'studio-td';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎭 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for event elements with comprehensive selectors
            $('.event, .show, .theatre-show, article, .card, .performance, .play, .theater-event, .stage-show, .calendar-event, .upcoming-event, [data-event], .wp-block-group, .entry, .production, .spectacle, h1, h2, h3, h4, .event-item, .show-item, .event-card, .listing').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, [class*="title"], a[href*="/events/"]').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 120) return;
                    
                    // Filter out non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('newsletter')) return;

                    const description = $(element).find('.description, .summary, p').first().text().trim();
                    const dateText = $(element).find('.date, [class*="date"], time, [datetime]').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} - Live performance at Le Studio TD`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Le Studio TD',
                            address: 'Corner of rue Sainte-Catherine and place des Festivals, Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5077,
                            longitude: -73.5623
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Concert',
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

            // Filter out junk/UI elements
            const filteredEvents = filterEvents(events);
            
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
  const scraper = new StudioTDEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
