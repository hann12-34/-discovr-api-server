const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * PHI Centre Montreal Event Scraper
 * Arts and digital culture venue in Old Montreal
 * Website: https://phi.ca/en
 */
class PHICentreEvents {
    constructor() {
        this.name = 'PHI Centre';
        this.eventsUrl = 'https://phi.ca/en/whats-on/';
        this.source = 'phi-centre';
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

            // Look for PHI Centre events, exhibitions, and programs
            $('article, .event, .exhibition, .show, .program, .card, .listing, h2, h3, h4, .title, .event-title, [data-event]').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .name, .event-title, .exhibition-title').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 200) return;
                    
                    // Filter out common non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe') ||
                        lowercaseTitle.includes('plan your visit') ||
                        lowercaseTitle.includes('archives') ||
                        lowercaseTitle.includes('explore our') ||
                        lowercaseTitle.includes('filters') ||
                        lowercaseTitle.includes('reset') ||
                        lowercaseTitle.includes('pricing') ||
                        lowercaseTitle.includes('accessibility') ||
                        lowercaseTitle.includes('faq') ||
                        lowercaseTitle.includes('careers') ||
                        lowercaseTitle.includes('press') ||
                        lowercaseTitle.includes('box office') ||
                        lowercaseTitle.includes('what\'s on') ||
                        lowercaseTitle.includes('©') ||
                        title.length < 8) return;

                    // Look for date information
                    const dateText = $element.find('.date, .event-date, .exhibition-date, time, .when, .duration').first().text().trim() ||
                                     $element.closest('article, .event, .exhibition').find('.date, .event-date, .exhibition-date, time, .when, .duration').first().text().trim();

                    // Look for location/venue info
                    const location = $element.find('.location, .venue, .address').first().text().trim() ||
                                     $element.closest('article, .event, .exhibition').find('.location, .venue, .address').first().text().trim();

                    // Look for description
                    const description = $element.find('.description, .excerpt, p, .summary').first().text().trim();

                    // Look for event type/category
                    const eventType = $element.find('.type, .category, .tag').first().text().trim() ||
                                      $element.closest('article, .event, .exhibition').find('.type, .category, .tag').first().text().trim();

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at PHI Centre Montreal`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: { name: this.extractVenueInfo(location), city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check website for pricing',
                        category: this.determineCategory(title, eventType),
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
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

    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Handle various date formats that might appear on the site
            const cleanDate = dateString.replace(/[^\w\s\-\/:.→]/g, '').trim();
            
            // Handle specific PHI date formats like "Sep. 10 → Jan. 11"
            if (cleanDate.includes('→')) {
                const parts = cleanDate.split('→');
                if (parts.length === 2) {
                    const startDate = parts[0].trim();
                    // Try to parse the start date
                    const parsedDate = new Date(`${startDate} 2025`);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate;
                    }
                }
            }
            
            // Try to parse the date normally
            const parsedDate = new Date(cleanDate);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (365 * 24 * 60 * 60 * 1000)) {
                return parsedDate;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    determineCategory(title, eventType) {
        const lowerTitle = title.toLowerCase();
        const lowerType = (eventType || '').toLowerCase();
        
        if (lowerType.includes('exhibition') || lowerTitle.includes('exhibition')) {
            return 'Exhibition';
        } else if (lowerType.includes('concert') || lowerTitle.includes('concert') || lowerTitle.includes('music')) {
            return 'Concert';
        } else if (lowerType.includes('contemporary art') || lowerTitle.includes('art')) {
            return 'Contemporary Art';
        } else if (lowerType.includes('cinema') || lowerTitle.includes('screening') || lowerTitle.includes('film')) {
            return 'Cinema';
        } else if (lowerType.includes('workshop') || lowerTitle.includes('workshop')) {
            return 'Workshop';
        } else if (lowerType.includes('conversation') || lowerTitle.includes('conversation') || lowerTitle.includes('talk')) {
            return 'Talk';
        } else if (lowerType.includes('tour') || lowerTitle.includes('tour')) {
            return 'Tour';
        }
        return 'Digital Arts';
    }

    extractVenueInfo(locationText) {
        const baseVenue = {
            name: 'PHI Centre',
            city: this.city,
            province: this.province,
            latitude: 45.5017,
            longitude: -73.5534
        };

        if (locationText && locationText.includes('Saint-Pierre')) {
            return {
                ...baseVenue,
                address: '407 Saint-Pierre Street, Montreal, QC'
            };
        } else if (locationText && locationText.includes('Saint-Jean')) {
            return {
                ...baseVenue,
                address: '451-465 Saint-Jean Street, Montreal, QC'
            };
        } else {
            return {
                ...baseVenue,
                address: '407 Saint-Pierre Street, Montreal, QC'
            };
        }
    }

    isEventLive(eventDate) {
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        return eventDate >= now && eventDate <= oneYearFromNow;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase()}-${event.date.toDateString()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export the scraper function
module.exports = async function scrapePHICentreEvents() {
    const scraper = new PHICentreEvents();
    return await scraper.scrapeEvents();
};
