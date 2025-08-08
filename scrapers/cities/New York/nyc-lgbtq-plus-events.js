/**
 * NYC LGBTQ+ Events Scraper
 *
 * Scrapes events from NYC LGBTQ+ community events and Pride activities
 * URL: https://www.eventbrite.com/d/ny--new-york/lgbtq/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCLGBTQPlusEvents {
    constructor() {
        this.venueName = 'NYC LGBTQ+ Events';
        this.venueLocation = 'Various NYC LGBTQ+ Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/lgbtq/';
        this.category = 'LGBTQ+ Community Events';
    }

    /**
     * Scrape events from NYC LGBTQ+ Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🏳️‍🌈 Scraping events from ${this.venueName}...`);

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

            // Look for LGBTQ+-specific event containers
            const eventSelectors = [
                '.lgbtq-event', '.pride-event', '.queer-event',
                '.event-item', '.event-card', '.event', '.community-event',
                '[class*="lgbtq"]', '[class*="pride"]', '[class*="event"]',
                '.card', '.content-card', '.rainbow-event', '.diversity-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .pride-title, .name, .headline').first().text().trim();

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

                        // Look for venue/location
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.location', '.where', '[class*="location"]', '.community-center'];
                        for (const venueSelector of venueSelectors) {
                            const venueElement = $el.find(venueSelector).first();
                            if (venueElement.length > 0) {
                                const venueText = venueElement.text().trim();
                                if (venueText && venueText.length > 0) {
                                    venue = venueText.length > 70 ? venueText.substring(0, 70) + '...' : venueText;
                                    break;
                                }
                            }
                        }

                        // Look for event theme/focus
                        let theme = this.category;
                        const themeSelectors = ['.theme', '.focus', '.category', '[class*="theme"]'];
                        for (const themeSelector of themeSelectors) {
                            const themeElement = $el.find(themeSelector).first();
                            if (themeElement.length > 0) {
                                const themeText = themeElement.text().trim();
                                if (themeText && themeText.length > 0) {
                                    theme = themeText;
                                    break;
                                }
                            }
                        }

                        // Look for community/identity focus
                        let community = '';
                        const communitySelectors = ['.community', '.identity', '.group', '[class*="community"]'];
                        for (const communitySelector of communitySelectors) {
                            const communityElement = $el.find(communitySelector).first();
                            if (communityElement.length > 0) {
                                community = communityElement.text().trim();
                                if (community) break;
                            }
                        }

                        // Look for organizer/host
                        let organizer = '';
                        const organizerSelectors = ['.organizer', '.host', '.organization', '[class*="organizer"]'];
                        for (const orgSelector of organizerSelectors) {
                            const orgElement = $el.find(orgSelector).first();
                            if (orgElement.length > 0) {
                                organizer = orgElement.text().trim();
                                if (organizer) break;
                            }
                        }

                        // Look for safe space info
                        let safeSpace = '';
                        const safeSpaceSelectors = ['.safe-space', '.inclusive', '.welcoming', '[class*="safe"]'];
                        for (const safeSelector of safeSpaceSelectors) {
                            const safeElement = $el.find(safeSelector).first();
                            if (safeElement.length > 0) {
                                safeSpace = safeElement.text().trim();
                                if (safeSpace) break;
                            }
                        }

                        // Look for cost/admission
                        let cost = '';
                        const costSelectors = ['.price', '.cost', '.fee', '[class*="price"]'];
                        for (const costSelector of costSelectors) {
                            const costElement = $el.find(costSelector).first();
                            if (costElement.length > 0) {
                                const costText = costElement.text().trim();
                                if (costText && (costText.includes('$') || costText.toLowerCase().includes('free'))) {
                                    cost = costText;
                                    break;
                                }
                            }
                        }

                        // Look for age restrictions
                        let ageRestriction = '';
                        const ageSelectors = ['.age-restriction', '.age', '.21+', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                ageRestriction = ageElement.text().trim();
                                if (ageRestriction) break;
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
                            venue: venue,
                            location: this.venueLocation,
                            date: dateTime || 'Check website for LGBTQ+ event schedule',
                            category: theme,
                            community: community,
                            organizer: organizer,
                            safeSpace: safeSpace,
                            cost: cost,
                            ageRestriction: ageRestriction,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCLGBTQPlusEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general LGBTQ+ community information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasLGBTQKeywords = text.match(/\b(lgbtq|lgbt|pride|queer|gay|lesbian|bisexual|transgender|rainbow|community|inclusive)\b/i);
                    const hasEventPattern = text.match(/\b(event|party|celebration|march|festival|gathering|meetup|social|night)\b/i);

                    if (hasLGBTQKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for LGBTQ+ event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCLGBTQPlusEvents'
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

        // Check for valid LGBTQ+ community keywords
        const validKeywords = [
            'lgbtq', 'lgbt', 'pride', 'queer', 'gay', 'lesbian',
            'bisexual', 'transgender', 'rainbow', 'community', 'inclusive',
            'event', 'party', 'celebration', 'march', 'festival', 'gathering'
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
  const scraper = new NYCLGBTQPlusEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCLGBTQPlusEvents = NYCLGBTQPlusEvents;