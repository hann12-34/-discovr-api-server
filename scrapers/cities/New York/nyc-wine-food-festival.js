/**
 * NYC Wine & Food Festival Events Scraper
 *
 * Scrapes events from NYC Wine & Food Festival
 * URL: https://nycwff.org
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCWineFoodFestival {
    constructor() {
        this.venueName = 'NYC Wine & Food Festival';
        this.venueLocation = 'Various NYC Venues';
        this.baseUrl = 'https://nycwff.org';
        this.eventsUrl = 'https://nycwff.org';
        this.category = 'Food & Wine Festival';
    }

    /**
     * Scrape events from NYC Wine & Food Festival
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🍷 Scraping events from ${this.venueName}...`);

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

            // Look for festival-specific event containers
            const eventSelectors = [
                '.festival-event', '.wine-event', '.food-event', '.tasting-event',
                '.event-item', '.event-card', '.event', '.culinary-event',
                '[class*="event"]', '[class*="tasting"]', '[class*="dinner"]',
                '.card', '.content-card', '.chef-event', '.restaurant-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .tasting-title, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for date information
                        let dateText = '';
                        const dateSelectors = [
                            '.date', '.event-date', '[class*="date"]',
                            'time', '.datetime', '.when', '.schedule', '.time-info',
                            '.festival-date', '.tasting-date'
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
                        const locationSelectors = ['.venue', '.location', '.where', '[class*="venue"]', '.restaurant'];
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

                        // Look for chef/host information
                        let chef = '';
                        const chefSelectors = ['.chef', '.host', '.presenter', '[class*="chef"]'];
                        for (const chefSelector of chefSelectors) {
                            const chefElement = $el.find(chefSelector).first();
                            if (chefElement.length > 0) {
                                chef = chefElement.text().trim();
                                if (chef) break;
                            }
                        }

                        // Look for price information
                        let priceInfo = '';
                        const priceSelectors = ['.price', '.cost', '[class*="price"]', '.ticket', '.admission'];
                        for (const priceSelector of priceSelectors) {
                            const priceElement = $el.find(priceSelector).first();
                            if (priceElement.length > 0) {
                                priceInfo = priceElement.text().trim();
                                if (priceInfo) break;
                            }
                        }

                        // Look for event type (tasting, dinner, class, etc.)
                        let eventType = this.category;
                        const typeSelectors = ['.type', '.category', '.event-type', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.length > 0) {
                                    eventType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for cuisine or wine type
                        let cuisineType = '';
                        const cuisineSelectors = ['.cuisine', '.wine-type', '.food-type', '[class*="cuisine"]'];
                        for (const cuisineSelector of cuisineSelectors) {
                            const cuisineElement = $el.find(cuisineSelector).first();
                            if (cuisineElement.length > 0) {
                                cuisineType = cuisineElement.text().trim();
                                if (cuisineType) break;
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
                            category: eventType,
                            chef: chef,
                            cuisineType: cuisineType,
                            priceInfo: priceInfo,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCWineFoodFestival'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general festival information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasFoodKeywords = text.match(/\b(wine|food|festival|chef|restaurant|tasting|dinner|culinary|cooking|dining)\b/i);
                    const hasDatePattern = text.match(/\b(2024|2025|oct|october|nov|november|weekend|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}\b/i);

                    if (hasFoodKeywords && hasDatePattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: hasDatePattern[0] || 'Check website for festival dates',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCWineFoodFestival'
                            };

                            events.push(event);
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
        if (!title || title.length < 10 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'buy tickets'
        ];

        // Check for valid food/wine festival keywords
        const validKeywords = [
            'wine', 'food', 'chef', 'restaurant', 'tasting', 'dinner',
            'culinary', 'cooking', 'dining', 'festival', 'event'
        ];

        const titleLower = title.toLowerCase();
        const hasValidKeyword = validKeywords.some(keyword => titleLower.includes(keyword));
        const hasInvalidKeyword = invalidKeywords.some(keyword => titleLower.includes(keyword));

        return hasValidKeyword && !hasInvalidKeyword;
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
  const scraper = new NYCWineFoodFestival();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCWineFoodFestival = NYCWineFoodFestival;