const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Bell Centre Montreal Event Scraper
 * Montreal's largest venue - home of the Montreal Canadiens
 * Website: https://centrebell.ca/en
 */
class BellCentreEvents {
    constructor() {
        this.name = 'Bell Centre';
        this.eventsUrl = 'https://centrebell.ca/en/events';
        this.ticketmasterUrl = 'https://www.ticketmaster.ca/centre-bell-tickets-montreal/venue/401966';
        this.source = 'bell-centre';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🏒 Scraping events from ${this.source}...`);

            let events = [];

            // Try primary Bell Centre events page
            try {
                const response = await axios.get(this.eventsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                
                // Look for event elements
                $('.event, .show, .concert, .game, .card, .listing, article, .event-item, .performance, [data-event], h2, h3, h4, .title, .event-title, .show-title').each((index, element) => {
                    const eventData = this.extractEventFromElement($, element);
                    if (eventData) {
                        events.push(eventData);
                    }
                });
            } catch (primaryError) {
                console.log(`Primary URL failed: ${primaryError.message}`);
            }

            // Try Ticketmaster as backup source
            if (events.length === 0) {
                try {
                    const response = await axios.get(this.ticketmasterUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 30000
                    });

                    const $ = cheerio.load(response.data);
                    
                    // Look for Ticketmaster event listings
                    $('.eds-event-card, .event-tile, .event-card, .listing-card, [data-testid*="event"], .eds-card-slot, h3, h4, .event-name, .event-title').each((index, element) => {
                        const eventData = this.extractEventFromElement($, element);
                        if (eventData) {
                            events.push(eventData);
                        }
                    });
                } catch (ticketmasterError) {
                    console.log(`Ticketmaster URL failed: ${ticketmasterError.message}`);
                }
            }

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    extractEventFromElement($, element) {
        try {
            const $element = $(element);
            const title = $element.find('h1, h2, h3, h4, .title, .name, .event-name, .event-title, .show-title').first().text().trim() ||
                          $element.text().trim();
            
            if (!title || title.length < 3 || title.length > 200) return null;
            
            // Filter out common non-event content
            const lowercaseTitle = title.toLowerCase();
            if (lowercaseTitle.includes('cookie') || 
                lowercaseTitle.includes('newsletter') ||
                lowercaseTitle.includes('menu') ||
                lowercaseTitle.includes('contact') ||
                lowercaseTitle.includes('about') ||
                lowercaseTitle.includes('subscribe') ||
                lowercaseTitle.includes('search') ||
                lowercaseTitle.includes('quick access') ||
                lowercaseTitle.includes('recent search') ||
                lowercaseTitle.includes('home') ||
                lowercaseTitle.includes('calendar') ||
                lowercaseTitle.includes('faq') ||
                lowercaseTitle.includes('privacy') ||
                lowercaseTitle.includes('©') ||
                title.length < 5) return null;

            // Look for date information
            const dateText = $element.find('.date, .event-date, .show-date, time, .when, .datetime').first().text().trim() ||
                             $element.closest('article, .event, .show, .card').find('.date, .event-date, .show-date, time, .when, .datetime').first().text().trim();

            // Look for description
            const description = $element.find('.description, .event-description, .excerpt, p, .summary').first().text().trim();

            const eventData = {
                id: uuidv4(),
                name: title,
                title: title,
                description: description && description.length > 20 ? description : `${title} - ${title} at Bell Centre Montreal`,
                date: this.parseDate(dateText) || new Date(),
                venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                city: this.city,
                province: this.province,
                price: 'Check website for pricing',
                category: this.determineCategory(title),
                source: this.source,
                url: this.eventsUrl,
                scrapedAt: new Date()
            };

            return this.isEventLive(eventData.date) ? eventData : null;
        } catch (error) {
            console.log(`❌ Error extracting event:`, error.message);
            return null;
        }
    }

    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Handle various date formats
            const cleanDate = dateString.replace(/[^\w\s\-\/:.]/g, '').trim();
            
            const parsedDate = new Date(cleanDate);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (365 * 24 * 60 * 60 * 1000)) {
                return parsedDate;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    determineCategory(title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('canadiens') || lowerTitle.includes('hockey') || lowerTitle.includes('nhl')) {
            return 'Sports';
        } else if (lowerTitle.includes('concert') || lowerTitle.includes('music') || lowerTitle.includes('tour')) {
            return 'Concert';
        } else if (lowerTitle.includes('comedy') || lowerTitle.includes('stand-up')) {
            return 'Comedy';
        } else if (lowerTitle.includes('show') || lowerTitle.includes('performance')) {
            return 'Entertainment';
        }
        return 'Event';
    }

    extractVenueInfo() {
        return {
            name: 'Bell Centre',
            address: '1909 Avenue des Canadiens-de-Montréal, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.4960,
            longitude: -73.5693
        };
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
module.exports = async function scrapeBellCentreEvents() {
    const scraper = new BellCentreEvents();
    return await scraper.scrapeEvents();
};
