const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Olympia Theatre Montreal Event Scraper
 * Major comedy and concert venue in Montreal
 * Website: https://www.olympiamontreal.com/en
 */
class OlympiaMontrealEvents {
    constructor() {
        this.name = 'Olympia Theatre Montreal';
        this.eventsUrl = 'https://www.olympiamontreal.com/en/programmation/';
        this.source = 'olympia-montreal';
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

            // Look for event elements on Olympia's programming page
            $('article, .show, .event, .card, .performance, .program-item, .artist, .spectacle, .show-item, [data-show], .event-card, h2, h3, h4, .title, .artist-name').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .name, .artist').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 3 || title.length > 150) return;
                    
                    // Filter out common non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe') ||
                        lowercaseTitle.includes('legal') ||
                        lowercaseTitle.includes('privacy') ||
                        lowercaseTitle.includes('©') ||
                        lowercaseTitle.includes('rights reserved')) return;

                    // Look for date information
                    const dateText = $element.find('.date, .show-date, .event-date, time, .when').first().text().trim() ||
                                     $element.closest('article, .show, .event').find('.date, .show-date, .event-date, time, .when').first().text().trim();

                    // Look for description or additional info
                    const description = $element.find('.description, .show-description, .excerpt, p').first().text().trim();

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Olympia Theatre Montreal`,
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
            const cleanDate = dateString.replace(/[^\w\s\-\/:.]/g, '').trim();
            
            // Try to parse the date
            const parsedDate = new Date(cleanDate);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (365 * 24 * 60 * 60 * 1000)) {
                return parsedDate;
            }

            // If parsing fails, return null to use current date as fallback
            return null;
        } catch (error) {
            return null;
        }
    }

    determineCategory(title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('comedy') || lowerTitle.includes('stand-up') || lowerTitle.includes('comic')) {
            return 'Comedy';
        } else if (lowerTitle.includes('concert') || lowerTitle.includes('music') || lowerTitle.includes('band')) {
            return 'Concert';
        } else if (lowerTitle.includes('theatre') || lowerTitle.includes('play') || lowerTitle.includes('drama')) {
            return 'Theatre';
        } else if (lowerTitle.includes('drag') || lowerTitle.includes('show')) {
            return 'Performance';
        }
        return 'Entertainment';
    }

    extractVenueInfo() {
        return {
            name: 'Olympia Theatre Montreal',
            address: '1004 Rue Sainte-Catherine E, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.5150,
            longitude: -73.5526
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
module.exports = async function scrapeOlympiaMontrealEvents() {
    const scraper = new OlympiaMontrealEvents();
    return await scraper.scrapeEvents();
};
