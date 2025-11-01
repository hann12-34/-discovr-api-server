const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

class MuralFestivalEvents {
    constructor() {
        this.name = 'MURAL Festival';
        this.eventsUrl = 'https://muralfestival.com/';
        this.source = 'mural-festival';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎨 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // No hardcoded festival events - only extract real events from page

            // Extract any content that might be festival-related
            $('*').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Look for MURAL festival related content
                    if (text && text.length > 10 && text.length < 200 && 
                        (text.toLowerCase().includes('mural') || 
                         text.toLowerCase().includes('festival') ||
                         text.toLowerCase().includes('art') ||
                         text.toLowerCase().includes('artist') ||
                         text.toLowerCase().includes('exhibition') ||
                         text.toLowerCase().includes('street art') ||
                         text.toLowerCase().includes('culture') ||
                         text.toLowerCase().includes('montreal'))) {
                        
                        const title = text.substring(0, 80);
                        
                        // Filter out common non-event content
                        const lowercaseTitle = title.toLowerCase();
                        if (lowercaseTitle.includes('cookie') || 
                            lowercaseTitle.includes('menu') ||
                            lowercaseTitle.includes('contact') ||
                            lowercaseTitle.includes('about') ||
                            lowercaseTitle.includes('newsletter') ||
                            lowercaseTitle.includes('subscribe') ||
                            lowercaseTitle.includes('privacy')) return;

                        const description = $(element).find('p, .description, .details').first().text().trim();
                        const dateText = $(element).find('.date, .dates, time, .when').first().text().trim();
                        
                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} - ${title} at MURAL Festival`,
                            date: this.parseDate(dateText) || new Date(),
                            venue: {
                                name: 'Boulevard Saint-Laurent',
                                address: 'Boulevard Saint-Laurent, Montreal, QC',
                                city: this.city,
                                province: this.province,
                                latitude: 45.5088,
                                longitude: -73.5878
                            },
                            city: this.city,
                            province: this.province,
                            category: 'Arts & Culture',
                            source: this.source,
                            scrapedAt: new Date()
                        };

                        if (this.isEventLive(eventData.date)) {
                            events.push(eventData);
                        }
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
  const scraper = new MuralFestivalEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;



