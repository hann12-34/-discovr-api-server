/**
 * NYC Shopping & Retail Events Scraper
 *
 * Scrapes shopping, retail, and pop-up events from NYC stores and markets
 * URL: https://www.eventbrite.com/d/ny--new-york/shopping/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCShoppingRetailEvents {
    constructor() {
        this.venueName = 'NYC Shopping & Retail Events';
        this.venueLocation = 'Various NYC Stores & Markets';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/shopping/';
        this.category = 'Shopping & Retail';
    }

    /**
     * Scrape events from NYC Shopping & Retail Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🛍️ Scraping events from ${this.venueName}...`);

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

            // Look for shopping/retail-specific event containers
            const eventSelectors = [
                '.shopping-event', '.retail-event', '.popup-event',
                '.event-item', '.event-card', '.event', '.market-event',
                '[class*="shopping"]', '[class*="retail"]', '[class*="event"]',
                '.card', '.content-card', '.sale-event', '.fashion-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .shopping-title, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for event date/time
                        let dateTime = '';
                        const dateSelectors = [
                            '.date', '.datetime', '[class*="date"]',
                            'time', '.when', '.schedule', '.event-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for store/venue
                        let store = this.venueLocation;
                        const storeSelectors = ['.store', '.venue', '.location', '[class*="store"]', '.retailer'];
                        for (const storeSelector of storeSelectors) {
                            const storeElement = $el.find(storeSelector).first();
                            if (storeElement.length > 0) {
                                const storeText = storeElement.text().trim();
                                if (storeText && storeText.length > 0) {
                                    store = storeText.length > 70 ? storeText.substring(0, 70) + '...' : storeText;
                                    break;
                                }
                            }
                        }

                        // Look for product category
                        let productCategory = '';
                        const categorySelectors = ['.category', '.product-type', '.merchandise', '[class*="category"]'];
                        for (const catSelector of categorySelectors) {
                            const catElement = $el.find(catSelector).first();
                            if (catElement.length > 0) {
                                productCategory = catElement.text().trim();
                                if (productCategory) break;
                            }
                        }

                        // Look for brand/designer
                        let brand = '';
                        const brandSelectors = ['.brand', '.designer', '.label', '[class*="brand"]'];
                        for (const brandSelector of brandSelectors) {
                            const brandElement = $el.find(brandSelector).first();
                            if (brandElement.length > 0) {
                                brand = brandElement.text().trim();
                                if (brand) break;
                            }
                        }

                        // Look for discount/sale info
                        let discount = '';
                        const discountSelectors = ['.discount', '.sale', '.off', '[class*="discount"]'];
                        for (const discountSelector of discountSelectors) {
                            const discountElement = $el.find(discountSelector).first();
                            if (discountElement.length > 0) {
                                const discountText = discountElement.text().trim();
                                if (discountText && (discountText.includes('%') || discountText.toLowerCase().includes('off'))) {
                                    discount = discountText;
                                    break;
                                }
                            }
                        }

                        // Look for price range
                        let priceRange = '';
                        const priceSelectors = ['.price-range', '.price', '.cost', '[class*="price"]'];
                        for (const priceSelector of priceSelectors) {
                            const priceElement = $el.find(priceSelector).first();
                            if (priceElement.length > 0) {
                                const priceText = priceElement.text().trim();
                                if (priceText && priceText.includes('$')) {
                                    priceRange = priceText;
                                    break;
                                }
                            }
                        }

                        // Look for special features
                        let features = '';
                        const featureSelectors = ['.features', '.special', '.highlight', '[class*="feature"]'];
                        for (const featureSelector of featureSelectors) {
                            const featureElement = $el.find(featureSelector).first();
                            if (featureElement.length > 0) {
                                features = featureElement.text().trim();
                                if (features) break;
                            }
                        }

                        // Look for size/fit info
                        let sizing = '';
                        const sizeSelectors = ['.sizing', '.size', '.fit', '[class*="size"]'];
                        for (const sizeSelector of sizeSelectors) {
                            const sizeElement = $el.find(sizeSelector).first();
                            if (sizeElement.length > 0) {
                                sizing = sizeElement.text().trim();
                                if (sizing) break;
                            }
                        }

                        // Look for availability
                        let availability = '';
                        const availSelectors = ['.availability', '.stock', '.limited', '[class*="availability"]'];
                        for (const availSelector of availSelectors) {
                            const availElement = $el.find(availSelector).first();
                            if (availElement.length > 0) {
                                availability = availElement.text().trim();
                                if (availability) break;
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
                            venue: store,
                            location: this.venueLocation,
                            date: dateTime || 'Check website for shopping event schedule',
                            category: this.category,
                            productCategory: productCategory,
                            brand: brand,
                            discount: discount,
                            priceRange: priceRange,
                            features: features,
                            sizing: sizing,
                            availability: availability,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCShoppingRetailEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general shopping/retail information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasShoppingKeywords = text.match(/\b(shopping|retail|store|shop|market|pop-up|popup|fashion|sale|discount)\b/i);
                    const hasEventPattern = text.match(/\b(event|launch|opening|sale|market|showcase|exhibition|fair)\b/i);

                    if (hasShoppingKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for shopping event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCShoppingRetailEvents'
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
     * Remove duplicate events based on title and venue
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.venue}`.toLowerCase();
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
            'newsletter', 'subscribe', 'follow', 'social media', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'directions'
        ];

        // Check for valid shopping/retail keywords
        const validKeywords = [
            'shopping', 'retail', 'store', 'shop', 'market', 'pop-up',
            'popup', 'fashion', 'sale', 'discount', 'event', 'launch',
            'opening', 'showcase', 'exhibition', 'fair'
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
  const scraper = new NYCShoppingRetailEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCShoppingRetailEvents = NYCShoppingRetailEvents;