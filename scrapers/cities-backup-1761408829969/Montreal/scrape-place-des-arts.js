const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class PlaceDesArtsEvents {
    constructor() {
        this.baseUrl = 'https://www.placedesarts.com';
        this.eventsUrl = 'https://placedesarts.com/en/programming';
        this.source = 'Place des Arts';
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
            name: 'Place des Arts',
            address: '175 Rue Sainte-Catherine O, Montreal, QC H2X 1Z8',
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
            console.log(`🎭 Scraping events from ${this.source}...`);

            // Try the events API endpoint first
            const apiUrl = 'https://www.placedesarts.com/en/events?format=json';
            
            try {
                const apiResponse = await axios.get(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });

                if (apiResponse.data && Array.isArray(apiResponse.data.events)) {
                    return this.parseApiEvents(apiResponse.data.events);
                }
            } catch (apiError) {
                console.log('API endpoint failed, trying main page...');
            }

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Enhanced selectors for Place des Arts events - more aggressive approach
            $('.event, .show, .spectacle, article, .card, .event-item, .performance, .calendar-event, .upcoming-event, [data-event-id], .wp-block-group, .entry-content, .event-list-item, h1, h2, h3, h4, .wp-block-heading, .program-item, .activity, .concert').each((index, element) => {
                const $event = $(element);
                const title = this.cleanText(
                    $event.find('h1, h2, h3, h4, .title, .name').first().text() ||
                    $event.text().trim()
                );
                
                if (title && title.length > 5 && title.length < 200) {
                    // Filter out common non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe')) return;
                    const dateText = $event.find('.date, .when, time').first().text();
                    const eventDate = this.parseDate(dateText);
                    const description = this.cleanText($event.find('p, .description').first().text()) || `Event at ${this.source}`;
                    
                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} in Montreal`,
                        date: eventDate,
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check website for pricing',
                        category: 'Arts & Culture',
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

    parseApiEvents(apiEvents) {
        const events = [];
        
        apiEvents.forEach(event => {
            if (event.title || event.name) {
                const eventDate = this.parseDate(event.date || event.startDate || event.datetime);
                
                if (eventDate && this.isEventLive(eventDate)) {
                    events.push({
                        id: uuidv4(),
                        title: event.title || event.name,
                        description: event.description || event.summary || `Event at ${this.source}`,
                        date: eventDate,
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: event.price || 'Check website for pricing',
                        category: event.category || 'Arts & Culture',
                        source: this.source,
                        url: event.url || this.baseUrl,
                        image: event.image || null,
                        scrapedAt: new Date()
                    });
                }
            }
        });

        return this.removeDuplicateEvents(events);
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
  const scraper = new PlaceDesArtsEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

