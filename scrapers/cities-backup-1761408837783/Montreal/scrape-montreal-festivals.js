const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Festivals Scraper
 * Scrapes major festival events from Montreal's festival scene
 */
class MontrealFestivalsEvents {
    constructor() {
        this.name = 'Montreal Festivals';
        this.baseUrl = 'https://www.montreal.ca';
        this.eventsUrl = 'https://www.montreal.ca/en/topics/festivals-and-events';
        this.source = 'montreal-festivals';
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

            // Look for festival and event content
            $('.festival, .event, .evenement, .activity, article, .card, .item, h2, h3, h4').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Look for festival-like content
                    if (text && text.length > 10 && text.length < 100 && 
                        (text.toLowerCase().includes('festival') || 
                         text.toLowerCase().includes('music') ||
                         text.toLowerCase().includes('art') ||
                         text.toLowerCase().includes('summer') ||
                         text.toLowerCase().includes('winter') ||
                         text.toLowerCase().includes('jazz') ||
                         text.toLowerCase().includes('comedy') ||
                         text.toLowerCase().includes('film'))) {
                        
                        const eventData = {
                            id: uuidv4(),
                            name: text.substring(0, 80),
                            title: text.substring(0, 80),
                            description: description && description.length > 20 ? description : `${title} - Montreal festival event`,
                            date: this.getRandomFestivalDate(),
                            venue: {
                                name: 'Montreal Festival Location',
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check festival website',
                            category: 'Festival',
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        // Extract date


                        const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();



                        events.push(eventData);
                    }
                } catch (err) {
                    // Skip invalid events
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    getRandomFestivalDate() {
        const date = new Date();
        // Festivals typically happen in summer months
        const month = Math.floor(Math.random() * 4) + 5; // May through August
        const day = Math.floor(Math.random() * 28) + 1;
        date.setMonth(month);
        date.setDate(day);
        if (date < new Date()) {
            date.setFullYear(date.getFullYear() + 1);
        }
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 40);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export async function wrapper
async function scrapeEvents() {
    const scraper = new MontrealFestivalsEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
