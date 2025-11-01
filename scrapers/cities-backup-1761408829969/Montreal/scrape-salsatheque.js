const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Salsatheque Events Scraper
 * Scrapes dance parties and salsa events from Salsatheque in Montreal
 */
class SalsathequeEvents {
    constructor() {
        this.name = 'Salsatheque';
        this.eventsUrl = 'https://www.salsatheque.ca/parties.html';
        this.source = 'salsatheque';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`💃 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for event elements
            $('.event, .party, .dance, .class, article, .card, .listing, tr').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .name, td:first-child').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .details, .info, td:nth-child(2)').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .when, td:last-child').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} - Salsa dance party`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Salsatheque',
                            address: '4848 Boulevard Saint-Laurent, Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5224,
                            longitude: -73.5899
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Dance',
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
            // Translate French months and days to English
            const frenchToEnglish = {
                'janvier': 'january', 'février': 'february', 'mars': 'march',
                'avril': 'april', 'mai': 'may', 'juin': 'june',
                'juillet': 'july', 'août': 'august', 'septembre': 'september',
                'octobre': 'october', 'novembre': 'november', 'décembre': 'december',
                'lundi': 'monday', 'mardi': 'tuesday', 'mercredi': 'wednesday',
                'jeudi': 'thursday', 'vendredi': 'friday', 'samedi': 'saturday', 'dimanche': 'sunday'
            };
            
            let processedDate = dateStr.toLowerCase();
            for (const [french, english] of Object.entries(frenchToEnglish)) {
                processedDate = processedDate.replace(new RegExp(french, 'gi'), english);
            }
            
            return new Date(processedDate);
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
  const scraper = new SalsathequeEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
