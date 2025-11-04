const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class VENUE_NAMEEvents {
    constructor() {
        this.baseUrl = 'BASE_URL';
        this.eventsUrl = 'EVENTS_URL';
        this.source = 'SOURCE_NAME';
        this.city = 'Montreal';
        this.province = 'QC';
        this.isEnabled = true;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) return new Date(isoMatch[1]);
            
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
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    }

    extractVenueInfo() {
        return {
            name: 'VENUE_DISPLAY_NAME',
            address: 'Montreal, QC',
            city: 'Montreal',
            province: 'QC',
            latitude: 45.5088,
            longitude: -73.5878
        };
    }

    filterLiveEvents(events) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return events.filter(event => {
            if (!event.date) return true;
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title.toLowerCase()}-${event.date ? event.date.toDateString() : 'no-date'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async scrapeEvents() {
        if (!this.isEnabled) {
            console.log(`🚫 ${this.source} scraper is disabled`);
            return [];
        }

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

            // Look for event selectors
            $('.event, .event-item, .card, article, .listing').each((i, element) => {
                const $event = $(element);
                const title = this.cleanText($event.find('h1, h2, h3, h4, .title, .name').first().text());
                
                if (title && title.length > 3) {
                    const dateText = $event.find('.date, .when, time').first().text();
                    const eventDate = this.parseDate(dateText);
                    const description = this.cleanText($event.find('p, .description').first().text()) || `Event at ${this.source}`;
            // Extract date

            // Normalize date
            if (dateText) {
              dateText = String(dateText)
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
                .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
                .trim();
              if (!/\d{4}/.test(dateText)) {
                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth();
                const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                const dateLower = dateText.toLowerCase();
                const monthIndex = months.findIndex(m => dateLower.includes(m));
                if (monthIndex !== -1) {
                  const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                  dateText = `${dateText}, ${year}`;
                }
              }
            }

            events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} in Montreal`,
                        date: eventDate,
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check website for pricing',
                        category: 'Entertainment',
                        source: this.source,
                        url: this.baseUrl,
                        image: null,
                        scrapedAt: new Date()
                    });
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            const liveEvents = this.filterLiveEvents(uniqueEvents);

            console.log(`🎉 Successfully scraped ${liveEvents.length} events from ${this.source}`);
            return liveEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new VENUE_NAMEEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

