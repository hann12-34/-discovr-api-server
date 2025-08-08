/**
 * NYC Farmers Markets Events Scraper
 *
 * Scrapes events from NYC farmers markets and greenmarkets
 * URL: https://www.grownyc.org/greenmarket
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCFarmersMarketsEvents {
    constructor() {
        this.venueName = 'NYC Farmers Markets';
        this.venueLocation = 'Various NYC Locations';
        this.baseUrl = 'https://www.grownyc.org';
        this.eventsUrl = 'https://www.grownyc.org/greenmarket';
        this.category = 'Farmers Markets & Greenmarkets';
    }

    /**
     * Scrape events from NYC Farmers Markets
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🥬 Scraping events from ${this.venueName}...`);

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

            // Look for farmers market-specific event containers
            const eventSelectors = [
                '.market-item', '.greenmarket-item', '.farmers-market',
                '.event-item', '.event-card', '.event', '.market-event',
                '[class*="market"]', '[class*="farmers"]', '[class*="event"]',
                '.card', '.content-card', '.vendor-list', '.market-listing'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .market-name, .event-name, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for market schedule/days
                        let schedule = '';
                        const scheduleSelectors = [
                            '.schedule', '.days', '.market-days', '[class*="schedule"]',
                            '.when', '.time', '.hours', '.operating-days'
                        ];

                        for (const scheduleSelector of scheduleSelectors) {
                            const scheduleElement = $el.find(scheduleSelector).first();
                            if (scheduleElement.length > 0) {
                                schedule = scheduleElement.text().trim();
                                if (schedule && schedule.length < 150) break;
                            }
                        }

                        // Look for location
                        let location = this.venueLocation;
                        const locationSelectors = ['.location', '.where', '.address', '[class*="location"]', '.site'];
                        for (const locSelector of locationSelectors) {
                            const locElement = $el.find(locSelector).first();
                            if (locElement.length > 0) {
                                const locText = locElement.text().trim();
                                if (locText && locText.length > 0) {
                                    location = locText.length > 80 ? locText.substring(0, 80) + '...' : locText;
                                    break;
                                }
                            }
                        }

                        // Look for neighborhood/borough
                        let neighborhood = '';
                        const neighborhoodSelectors = ['.neighborhood', '.borough', '.area', '[class*="neighborhood"]'];
                        for (const neighSelector of neighborhoodSelectors) {
                            const neighElement = $el.find(neighSelector).first();
                            if (neighElement.length > 0) {
                                neighborhood = neighElement.text().trim();
                                if (neighborhood) break;
                            }
                        }

                        // Look for vendors/products
                        let vendors = [];
                        const vendorSelectors = ['.vendor', '.farmer', '.producer', '[class*="vendor"]'];
                        vendorSelectors.forEach(vendorSelector => {
                            $el.find(vendorSelector).each((i, vendorEl) => {
                                const vendorName = $(vendorEl).text().trim();
                                if (vendorName && vendorName.length > 0 && vendorName.length < 50) {
                                    vendors.push(vendorName);
                                }
                            };
                        };

                        // Look for products/specialties
                        let products = [];
                        const productSelectors = ['.product', '.produce', '.specialty', '[class*="product"]'];
                        productSelectors.forEach(productSelector => {
                            $el.find(productSelector).each((i, productEl) => {
                                const productName = $(productEl).text().trim();
                                if (productName && productName.length > 0 && productName.length < 30) {
                                    products.push(productName);
                                }
                            };
                        };

                        // Look for market type
                        let marketType = this.category;
                        const typeSelectors = ['.type', '.market-type', '.category', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.length > 0) {
                                    marketType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for seasonal information
                        let season = '';
                        const seasonSelectors = ['.season', '.seasonal', '.months', '[class*="season"]'];
                        for (const seasonSelector of seasonSelectors) {
                            const seasonElement = $el.find(seasonSelector).first();
                            if (seasonElement.length > 0) {
                                season = seasonElement.text().trim();
                                if (season) break;
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
                            date: schedule || 'Check website for market schedule',
                            category: marketType,
                            neighborhood: neighborhood,
                            vendors: vendors.length > 0 ? vendors.slice(0, 8).join(', ') : '',
                            products: products.length > 0 ? products.slice(0, 8).join(', ') : '',
                            season: season,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCFarmersMarketsEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for market listings in tables and structured data
            $('table tr, .listing, .market-row').each((index, element) => {
                if (index > 200) return false; // Limit processing

                const $row = $(element);
                const text = $row.text().trim();

                if (text.length > 20 && text.length < 300) {
                    const hasMarketKeywords = text.match(/\b(market|farmers|greenmarket|vendors|produce|fresh|organic|local)\b/i);
                    const hasLocationPattern = text.match(/\b(\w+\s+(street|st|avenue|ave|plaza|square|park)|\w+\s+(between|and))\b/i);

                    if (hasMarketKeywords && hasLocationPattern) {
                        // Extract market name and location from table cells
                        const cells = [];
                        $row.find('td').each((i, td) => {
                            const cellText = $(td).text().trim();
                            if (cellText && cellText.length > 0) {
                                cells.push(cellText);
                            }
                        };

                        const title = cells.length > 0 ? cells[0] : text.split('\n')[0]?.trim();

                        if (title && this.isValidEvent(title)) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: hasLocationPattern[0] || this.venueLocation,
                                date: cells.length > 1 ? cells[1] : 'Check website for market schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCFarmersMarketsEvents'
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
     * Remove duplicate events based on title and location
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.location}`.toLowerCase();
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
        if (!title || title.length < 8 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'directions'
        ];

        // Check for valid farmers market keywords
        const validKeywords = [
            'market', 'farmers', 'greenmarket', 'fresh', 'produce',
            'organic', 'local', 'vendors', 'farm', 'seasonal'
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
  const scraper = new NYCFarmersMarketsEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCFarmersMarketsEvents = NYCFarmersMarketsEvents;