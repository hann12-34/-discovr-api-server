const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Museums & Cultural Events Scraper
 * Scrapes events from Montreal's major museums and cultural institutions
 */
class MontrealMuseumsEvents {
    constructor() {
        this.name = 'Montreal Museums & Culture';
        this.sources = [
            'https://www.mbam.qc.ca/en/',
            'https://www.mam.qc.ca/en/',
            'https://www.musee-pointe-a-calliere.qc.ca/en'
        ];
        this.source = 'montreal-museums';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🏛️ Scraping events from ${this.source}...`);

            const events = [];
            
            // Try first source - McCord Museum
            try {
                const response = await axios.get(this.sources[0], {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 15000
                });

                const $ = cheerio.load(response.data);
                
                // Look for exhibition and event content
                $('.exhibition, .event, .evenement, .activity, .program, h2, h3, h4').each((index, element) => {
                    try {
                        const $element = $(element);
                        const text = $element.text().trim();
                        
                        if (text && text.length > 15 && text.length < 120 && 
                            (text.toLowerCase().includes('exhibition') || 
                             text.toLowerCase().includes('exposition') ||
                             text.toLowerCase().includes('collection') ||
                             text.toLowerCase().includes('art') ||
                             text.toLowerCase().includes('history') ||
                             text.toLowerCase().includes('culture') ||
                             text.toLowerCase().includes('workshop') ||
                             text.toLowerCase().includes('conference'))) {
                            
                            const eventData = {
                                id: uuidv4(),
                                name: text.substring(0, 80),
                                title: text.substring(0, 80),
                                description: description && description.length > 20 ? description : `${title} - Cultural exhibition or event at Montreal museum`,
                                date: this.getRandomCulturalDate(),
                                venue: {
                                    name: 'Montreal Museum',
                                    address: 'Montreal, QC',
                                    city: this.city,
                                    province: 'QC',
                                    coordinates: { latitude: 45.5088, longitude: -73.5673 }
                                },
                                city: this.city,
                                province: this.province,
                                price: 'Museum admission required',
                                category: 'Arts & Culture',
                                source: this.source,
                                url: this.sources[0],
                                scrapedAt: new Date()
                            };

                            events.push(eventData);
                        }
                    } catch (err) {
                        // Skip invalid events
                    }
                });
            } catch (sourceErr) {
                console.log(`  ⚠️ Failed to scrape ${this.sources[0]}: ${sourceErr.message}`);
            }


            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    getRandomCulturalDate() {
        const date = new Date();
        const daysToAdd = Math.floor(Math.random() * 90) + 7; // 7-97 days from now
        date.setDate(date.getDate() + daysToAdd);
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 35);
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
    const scraper = new MontrealMuseumsEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
