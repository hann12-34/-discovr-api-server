/**
 * NYC Media & Entertainment Events Scraper
 *
 * Scrapes media and entertainment industry events from NYC studios, agencies, and media venues
 * URL: https://www.eventbrite.com/d/ny--new-york/film-media/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCMediaEntertainmentEvents {
    constructor() {
        this.venueName = 'NYC Media & Entertainment Events';
        this.venueLocation = 'Various NYC Studios, Agencies & Media Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/film-media/';
        this.category = 'Media & Entertainment';
    }

    /**
     * Scrape events from NYC Media & Entertainment Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🎬 Scraping events from ${this.venueName}...`);

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

            // Look for media/entertainment-specific event containers
            const eventSelectors = [
                '.media-event', '.entertainment-event', '.film-event',
                '.event-item', '.event-card', '.event', '.industry-event',
                '[class*="media"]', '[class*="entertainment"]', '[class*="event"]',
                '.card', '.content-card', '.premiere-event', '.screening-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .film-title, .name, .headline').first().text().trim();

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
                            'time', '.when', '.schedule', '.event-time', '.screening-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/studio/theater
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.studio', '.theater', '[class*="venue"]', '.location', '.cinema'];
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

                        // Look for media type/genre
                        let mediaType = this.category;
                        const typeSelectors = ['.media-type', '.genre', '.category', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.length > 0) {
                                    mediaType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for director/creator
                        let director = '';
                        const directorSelectors = ['.director', '.creator', '.filmmaker', '[class*="director"]'];
                        for (const directorSelector of directorSelectors) {
                            const directorElement = $el.find(directorSelector).first();
                            if (directorElement.length > 0) {
                                director = directorElement.text().trim();
                                if (director) break;
                            }
                        }

                        // Look for cast/talent
                        let cast = '';
                        const castSelectors = ['.cast', '.talent', '.actors', '[class*="cast"]'];
                        for (const castSelector of castSelectors) {
                            const castElement = $el.find(castSelector).first();
                            if (castElement.length > 0) {
                                cast = castElement.text().trim();
                                if (cast) break;
                            }
                        }

                        // Look for production company/studio
                        let production = '';
                        const productionSelectors = ['.production', '.studio', '.network', '[class*="production"]'];
                        for (const productionSelector of productionSelectors) {
                            const productionElement = $el.find(productionSelector).first();
                            if (productionElement.length > 0) {
                                production = productionElement.text().trim();
                                if (production) break;
                            }
                        }

                        // Look for ticket price/admission
                        let admission = '';
                        const admissionSelectors = ['.admission', '.ticket-price', '.cost', '[class*="admission"]'];
                        for (const admissionSelector of admissionSelectors) {
                            const admissionElement = $el.find(admissionSelector).first();
                            if (admissionElement.length > 0) {
                                const admissionText = admissionElement.text().trim();
                                if (admissionText && (admissionText.includes('$') || admissionText.toLowerCase().includes('free'))) {
                                    admission = admissionText;
                                    break;
                                }
                            }
                        }

                        // Look for rating/age restriction
                        let rating = '';
                        const ratingSelectors = ['.rating', '.age-rating', '.mpaa', '[class*="rating"]'];
                        for (const ratingSelector of ratingSelectors) {
                            const ratingElement = $el.find(ratingSelector).first();
                            if (ratingElement.length > 0) {
                                const ratingText = ratingElement.text().trim();
                                if (ratingText && ratingText.match(/\b(G|PG|PG-13|R|NC-17|18\+|21\+)\b/i)) {
                                    rating = ratingText;
                                    break;
                                }
                            }
                        }

                        // Look for duration/runtime
                        let duration = '';
                        const durationSelectors = ['.duration', '.runtime', '.length', '[class*="duration"]'];
                        for (const durationSelector of durationSelectors) {
                            const durationElement = $el.find(durationSelector).first();
                            if (durationElement.length > 0) {
                                const durationText = durationElement.text().trim();
                                if (durationText && durationText.match(/\d+\s*(min|minute|hr|hour)/i)) {
                                    duration = durationText;
                                    break;
                                }
                            }
                        }

                        // Look for special features
                        let features = '';
                        const featureSelectors = ['.features', '.special', '.premiere', '[class*="feature"]'];
                        for (const featureSelector of featureSelectors) {
                            const featureElement = $el.find(featureSelector).first();
                            if (featureElement.length > 0) {
                                features = featureElement.text().trim();
                                if (features) break;
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
                            date: dateTime || 'Check website for media event schedule',
                            category: mediaType,
                            director: director,
                            cast: cast,
                            production: production,
                            admission: admission,
                            rating: rating,
                            duration: duration,
                            features: features,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCMediaEntertainmentEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general media/entertainment information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasMediaKeywords = text.match(/\b(media|film|movie|tv|television|entertainment|screening|premiere|documentary)\b/i);
                    const hasEventPattern = text.match(/\b(event|screening|premiere|festival|show|preview|launch|industry)\b/i);

                    if (hasMediaKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for media event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCMediaEntertainmentEvents'
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

        // Check for valid media/entertainment keywords
        const validKeywords = [
            'media', 'film', 'movie', 'tv', 'television', 'entertainment',
            'screening', 'premiere', 'documentary', 'event', 'show',
            'preview', 'launch', 'industry', 'festival', 'cinema'
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
  const scraper = new NYCMediaEntertainmentEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCMediaEntertainmentEvents = NYCMediaEntertainmentEvents;