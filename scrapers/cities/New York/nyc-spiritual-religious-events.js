/**
 * NYC Spiritual & Religious Events Scraper
 *
 * Scrapes spiritual and religious events from NYC churches, temples, and spiritual centers
 * URL: https://www.eventbrite.com/d/ny--new-york/spirituality-religion/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCSpiritualReligiousEvents {
    constructor() {
        this.venueName = 'NYC Spiritual & Religious Events';
        this.venueLocation = 'Various NYC Churches, Temples & Spiritual Centers';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/spirituality-religion/';
        this.category = 'Spiritual & Religious';
    }

    /**
     * Scrape events from NYC Spiritual & Religious Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🙏 Scraping events from ${this.venueName}...`);

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

            // Look for spiritual/religious-specific event containers
            const eventSelectors = [
                '.spiritual-event', '.religious-event', '.worship-event',
                '.event-item', '.event-card', '.event', '.service-event',
                '[class*="spiritual"]', '[class*="religious"]', '[class*="event"]',
                '.card', '.content-card', '.prayer-event', '.meditation-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .service-title, .name, .headline').first().text().trim();

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
                            'time', '.when', '.schedule', '.event-time', '.service-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/place of worship
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.church', '.temple', '[class*="venue"]', '.center', '.mosque', '.synagogue'];
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

                        // Look for faith tradition/denomination
                        let tradition = '';
                        const traditionSelectors = ['.tradition', '.denomination', '.faith', '[class*="tradition"]'];
                        for (const traditionSelector of traditionSelectors) {
                            const traditionElement = $el.find(traditionSelector).first();
                            if (traditionElement.length > 0) {
                                tradition = traditionElement.text().trim();
                                if (tradition) break;
                            }
                        }

                        // Look for spiritual leader/speaker
                        let leader = '';
                        const leaderSelectors = ['.leader', '.speaker', '.pastor', '.rabbi', '.imam', '[class*="leader"]'];
                        for (const leaderSelector of leaderSelectors) {
                            const leaderElement = $el.find(leaderSelector).first();
                            if (leaderElement.length > 0) {
                                leader = leaderElement.text().trim();
                                if (leader) break;
                            }
                        }

                        // Look for service type
                        let serviceType = this.category;
                        const serviceSelectors = ['.service-type', '.event-type', '.worship-type', '[class*="service"]'];
                        for (const serviceSelector of serviceSelectors) {
                            const serviceElement = $el.find(serviceSelector).first();
                            if (serviceElement.length > 0) {
                                const serviceText = serviceElement.text().trim();
                                if (serviceText && serviceText.length > 0) {
                                    serviceType = serviceText;
                                    break;
                                }
                            }
                        }

                        // Look for language
                        let language = '';
                        const languageSelectors = ['.language', '.lang', '.spoken-in', '[class*="language"]'];
                        for (const languageSelector of languageSelectors) {
                            const languageElement = $el.find(languageSelector).first();
                            if (languageElement.length > 0) {
                                language = languageElement.text().trim();
                                if (language) break;
                            }
                        }

                        // Look for age group/target audience
                        let audience = '';
                        const audienceSelectors = ['.audience', '.age-group', '.target', '[class*="audience"]'];
                        for (const audienceSelector of audienceSelectors) {
                            const audienceElement = $el.find(audienceSelector).first();
                            if (audienceElement.length > 0) {
                                audience = audienceElement.text().trim();
                                if (audience) break;
                            }
                        }

                        // Look for donation/offering info
                        let donation = '';
                        const donationSelectors = ['.donation', '.offering', '.contribution', '[class*="donation"]'];
                        for (const donationSelector of donationSelectors) {
                            const donationElement = $el.find(donationSelector).first();
                            if (donationElement.length > 0) {
                                donation = donationElement.text().trim();
                                if (donation) break;
                            }
                        }

                        // Look for dress code
                        let dressCode = '';
                        const dressSelectors = ['.dress-code', '.attire', '.dress', '[class*="dress"]'];
                        for (const dressSelector of dressSelectors) {
                            const dressElement = $el.find(dressSelector).first();
                            if (dressElement.length > 0) {
                                dressCode = dressElement.text().trim();
                                if (dressCode) break;
                            }
                        }

                        // Look for accessibility info
                        let accessibility = '';
                        const accessSelectors = ['.accessibility', '.wheelchair', '.accessible', '[class*="accessible"]'];
                        for (const accessSelector of accessSelectors) {
                            const accessElement = $el.find(accessSelector).first();
                            if (accessElement.length > 0) {
                                accessibility = accessElement.text().trim();
                                if (accessibility) break;
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
                            date: dateTime || 'Check website for spiritual event schedule',
                            category: serviceType,
                            tradition: tradition,
                            leader: leader,
                            language: language,
                            audience: audience,
                            donation: donation,
                            dressCode: dressCode,
                            accessibility: accessibility,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCSpiritualReligiousEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general spiritual/religious information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasSpiritualKeywords = text.match(/\b(spiritual|religious|worship|prayer|meditation|service|church|temple|faith|blessing)\b/i);
                    const hasEventPattern = text.match(/\b(event|service|gathering|ceremony|celebration|retreat|workshop|study)\b/i);

                    if (hasSpiritualKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for spiritual event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCSpiritualReligiousEvents'
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

        // Check for valid spiritual/religious keywords
        const validKeywords = [
            'spiritual', 'religious', 'worship', 'prayer', 'meditation', 'service',
            'church', 'temple', 'faith', 'blessing', 'event', 'gathering',
            'ceremony', 'celebration', 'retreat', 'workshop', 'study'
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
  const scraper = new NYCSpiritualReligiousEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCSpiritualReligiousEvents = NYCSpiritualReligiousEvents;