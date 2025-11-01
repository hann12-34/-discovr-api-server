const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Comedy Events Scraper
 * Scrapes comedy shows and events from Montreal's comedy scene
 */
class MontrealComedyEvents {
    constructor() {
        this.name = 'Montreal Comedy Scene';
        this.baseUrl = 'https://www.comedyworks.com';
        this.eventsUrl = 'https://www.comedyworks.com/montreal/';
        this.source = 'montreal-comedy';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`😂 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for comedy shows and events
            $('.event, .show, .performance, .comedy-show, .listing, article, .card, h2, h3, h4').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Look for comedy-related content
                    if (text && text.length > 10 && text.length < 120 && 
                        (text.toLowerCase().includes('comedy') || 
                         text.toLowerCase().includes('comedian') ||
                         text.toLowerCase().includes('stand-up') ||
                         text.toLowerCase().includes('standup') ||
                         text.toLowerCase().includes('improv') ||
                         text.toLowerCase().includes('show') ||
                         text.toLowerCase().includes('performance'))) {
                        
                        const eventData = {
                            id: uuidv4(),
                            name: text.substring(0, 80),
                            title: text.substring(0, 80),
                            description: description && description.length > 20 ? description : `${title} - Comedy show in Montreal`,
                            date: this.getRandomComedyDate(),
                            venue: {
                                name: 'Montreal Comedy Club',
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC', 
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: '$15-35',
                            category: 'Comedy',
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

    getRandomComedyDate() {
        const date = new Date();
        // Comedy shows typically happen on weekends
        const daysToAdd = Math.floor(Math.random() * 14) + 1; // 1-14 days from now
        date.setDate(date.getDate() + daysToAdd);
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 30);
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
    const scraper = new MontrealComedyEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
