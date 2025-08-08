/**
 * NYC Comedy Festival Events Scraper
 *
 * Scrapes events from NYC Comedy Festival
 * URL: https://nycomedyfest.com
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCComedyFestival {
    constructor() {
        this.venueName = 'NYC Comedy Festival';
        this.venueLocation = 'Various NYC Comedy Venues';
        this.baseUrl = 'https://www.comedycellar.com';
        this.eventsUrl = 'https://www.comedycellar.com/shows/';
        this.category = 'Comedy Festival';
    }

    /**
     * Scrape events from NYC Comedy Festival
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🎤 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'Referer': 'https://www.google.com/',
                    'DNT': '1',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for comedy shows and events with multiple approaches

            // Approach 1: Look for show listings
            $('.show, .show-item, .show-listing, .event, .performance').each((index, element) => {
                const $el = $(element);
                let title = $el.find('h1, h2, h3, h4, .title, .show-title, .comedian-name').first().text().trim() ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .bio').first().text().trim();
                const dateText = $el.find('.date, .show-date, .time').text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for show date/time information
                        let dateText = '';
                        const dateSelectors = [
                            '.date', '.show-date', '[class*="date"]',
                            'time', '.datetime', '.when', '.schedule', '.time-info',
                            '.festival-date', '.performance-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateText = dateElement.text().trim();
                                if (dateText && dateText.length < 100) break;
                            }
                        }

                        // Look for venue/location
                        let location = this.venueLocation;
                        const locationSelectors = ['.venue', '.location', '.where', '[class*="venue"]', '.theater'];
                        for (const locSelector of locationSelectors) {
                            const locElement = $el.find(locSelector).first();
                            if (locElement.length > 0) {
                                const locText = locElement.text().trim();
                                if (locText && locText.length > 0) {
                                    location = locText.length > 60 ? locText.substring(0, 60) + '...' : locText;
                                    break;
                                }
                            }
                        }

                        // Look for comedian information
                        let comedian = '';
                        const comedianSelectors = ['.comedian', '.performer', '.artist', '[class*="comedian"]', '.headliner'];
                        for (const comedianSelector of comedianSelectors) {
                            const comedianElement = $el.find(comedianSelector).first();
                            if (comedianElement.length > 0) {
                                comedian = comedianElement.text().trim();
                                if (comedian) break;
                            }
                        }

                        // Look for show type (stand-up, improv, sketch, etc.)
                        let showType = '';
                        const typeSelectors = ['.type', '.show-type', '.format', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                showType = typeElement.text().trim();
                                if (showType) break;
                            }
                        }

                        // Look for ticket price
                        let ticketPrice = '';
                        const priceSelectors = ['.price', '.ticket-price', '[class*="price"]', '.cost'];
                        for (const priceSelector of priceSelectors) {
                            const priceElement = $el.find(priceSelector).first();
                            if (priceElement.length > 0) {
                                ticketPrice = priceElement.text().trim();
                                if (ticketPrice) break;
                            }
                        }

                        // Look for age rating
                        let ageRating = '';
                        const ageSelectors = ['.age-rating', '.rating', '.mature', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                ageRating = ageElement.text().trim();
                                if (ageRating) break;
                            }
                        }

                        // Look for description
                        let description = '';
                        const descSelectors = ['.description', '.excerpt', '.summary', '.details', '.content'];
                        for (const descSelector of descSelectors) {
                            const descElement = $el.find(descSelector).first();
                            if (descElement.length > 0) {
                                description = descElement.text().trim();
                                if (description && description.length > 20 && description.length < 300) break;
                            }
                        }

                        // Look for link
                        let eventLink = $el.find('a').first().attr('href') || '';
                        if (eventLink && !eventLink.startsWith('http')) {
                            eventLink = this.baseUrl + eventLink;
                        }

                        const event = {
                            title: title,
                            venue: this.venueName,
                            location: location,
                            date: dateText || 'Check website for festival dates',
                            category: this.category,
                            comedian: comedian
                    };
                    events.push(event);
                }
            };

            // Approach 2: Look for comedian names and comedy content
            $('div, section, article').each((index, element) => {
                if (index > 150) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 200) {
                    const hasComedyKeywords = text.match(/\b(comedy|comedian|show|performance|standup|stand-up|laughs|funny|humor|comic)\b/i);
                    const hasEventKeywords = text.match(/\b(show|performance|night|event|live|tonight|this week|upcoming)\b/i);

                    if (hasComedyKeywords && hasEventKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 10);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 8).join(' ');

                        if (eventTitle && eventTitle.length > 10 && this.isValidEvent(eventTitle)) {
                            // events.push(this.createEvent(eventTitle, text.substring(0, 150), '', ''));
                        }
                    }
                }
            };

            // Remove duplicates
            const uniqueEvents = this.removeDuplicateEvents(events);

            console.log(`✅ ${this.venueName}: Found ${uniqueEvents.length} events`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }

    /**
     * Remove duplicate events based on title
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.title.toLowerCase().trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        };
    }

    /**
     * Check if the extracted text represents a valid event
     * @param {string} title - Event title to validate
     * @returns {boolean} Whether the title appears to be a valid event
     */
    isValidEvent(title) {
        if (!title || title.length < 5 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'buy tickets'
        ];

        const titleLower = title.toLowerCase();
        return !invalidKeywords.some(keyword => titleLower.includes(keyword));
    }

    /**
     * Get venue information
     * @returns {Object} Venue details
     */
    getVenueInfo() {
        return {
            name: this.venueName,
            location: this.venueLocation,
            category: this.category,
            website: this.baseUrl
        };
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new NYCComedyFestival();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCComedyFestival = NYCComedyFestival;