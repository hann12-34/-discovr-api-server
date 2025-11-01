const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class MreBoireEvents {
    constructor() {
        this.name = 'À Mère À Boire';
        this.eventsUrl = 'https://www.amereaboire.com/evenements';
        this.source = 'amereaboire';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Try more aggressive content extraction
            $('*').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Look for event-like content based on keywords and structure
                    if (text && text.length > 10 && text.length < 200 && 
                        (text.toLowerCase().includes('concert') || 
                         text.toLowerCase().includes('spectacle') ||
                         text.toLowerCase().includes('musique') ||
                         text.toLowerCase().includes('show') ||
                         text.toLowerCase().includes('soirée') ||
                         text.toLowerCase().includes('événement') ||
                         text.toLowerCase().includes('party') ||
                         text.toLowerCase().includes('dj') ||
                         text.toLowerCase().includes('band') ||
                         text.toLowerCase().includes('live'))) {
                        
                        // Extract a reasonable title
                        const title = text.substring(0, 80).replace(/\s+/g, ' ').trim();
                        
                        // Filter out common non-event content
                        const lowercaseTitle = title.toLowerCase();
                        if (lowercaseTitle.includes('cookie') || 
                            lowercaseTitle.includes('newsletter') ||
                            lowercaseTitle.includes('menu') ||
                            lowercaseTitle.includes('contact') ||
                            lowercaseTitle.includes('about') ||
                            lowercaseTitle.includes('privacy')) return;

                        const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                        const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                        
                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} - ${title} at À Mère À Boire`,
                            date: this.parseDate(dateText) || new Date(),
                            venue: {
                                name: 'À Mère À Boire',
                                address: '857 Boul Saint-Laurent, Montréal, QC',
                                city: this.city,
                                province: this.province,
                                latitude: 45.5088,
                                longitude: -73.5878
                            },
                            city: this.city,
                            province: this.province,
                            category: 'Food & Drinks',
                            source: this.source,
                            scrapedAt: new Date()
                        };

                        if (this.isEventLive(eventData.date)) {
                            events.push(eventData);
                        }
                    }
                } catch (error) {
                    console.log(`Error extracting event ${index + 1}:`, error.message);
                }
            });

            return filterEvents(events);
        } catch (error) {
            console.error(`Error scraping ${this.source}:`, error.message);
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
  const scraper = new MreBoireEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
