/**
 * NYC Book & Literary Events Scraper
 *
 * Scrapes book and literary events from NYC bookstores, libraries, and literary venues
 * URL: https://www.eventbrite.com/d/ny--new-york/books-literature/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCBookLiteraryEvents {
    constructor() {
        this.venueName = 'NYC Book & Literary Events';
        this.venueLocation = 'Various NYC Bookstores, Libraries & Literary Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/books-literature/';
        this.category = 'Books & Literature';
    }

    /**
     * Scrape events from NYC Book & Literary Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`📚 Scraping events from ${this.venueName}...`);

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

            // Look for book/literary-specific event containers
            const eventSelectors = [
                '.book-event', '.literary-event', '.reading-event',
                '.event-item', '.event-card', '.event', '.author-event',
                '[class*="book"]', '[class*="literary"]', '[class*="event"]',
                '.card', '.content-card', '.poetry-event', '.writing-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .book-title, .name, .headline').first().text().trim();

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

                        // Look for venue/bookstore/library
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.bookstore', '.library', '[class*="venue"]', '.location', '.shop'];
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

                        // Look for author/speaker
                        let author = '';
                        const authorSelectors = ['.author', '.speaker', '.writer', '[class*="author"]'];
                        for (const authorSelector of authorSelectors) {
                            const authorElement = $el.find(authorSelector).first();
                            if (authorElement.length > 0) {
                                author = authorElement.text().trim();
                                if (author) break;
                            }
                        }

                        // Look for book title
                        let bookTitle = '';
                        const bookSelectors = ['.book-title', '.title-book', '.featured-book', '[class*="book-title"]'];
                        for (const bookSelector of bookSelectors) {
                            const bookElement = $el.find(bookSelector).first();
                            if (bookElement.length > 0) {
                                bookTitle = bookElement.text().trim();
                                if (bookTitle) break;
                            }
                        }

                        // Look for genre/category
                        let genre = '';
                        const genreSelectors = ['.genre', '.category', '.type', '[class*="genre"]'];
                        for (const genreSelector of genreSelectors) {
                            const genreElement = $el.find(genreSelector).first();
                            if (genreElement.length > 0) {
                                const genreText = genreElement.text().trim();
                                if (genreText && genreText.match(/\b(fiction|poetry|memoir|biography|mystery|romance|fantasy|sci-fi)\b/i)) {
                                    genre = genreText;
                                    break;
                                }
                            }
                        }

                        // Look for event type
                        let eventType = this.category;
                        const typeSelectors = ['.event-type', '.activity-type', '.format', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.match(/\b(reading|signing|launch|discussion|workshop|club)\b/i)) {
                                    eventType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for cost/admission
                        let cost = '';
                        const costSelectors = ['.cost', '.price', '.admission', '[class*="cost"]'];
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

                        // Look for moderator/host
                        let moderator = '';
                        const moderatorSelectors = ['.moderator', '.host', '.interviewer', '[class*="moderator"]'];
                        for (const moderatorSelector of moderatorSelectors) {
                            const moderatorElement = $el.find(moderatorSelector).first();
                            if (moderatorElement.length > 0) {
                                moderator = moderatorElement.text().trim();
                                if (moderator) break;
                            }
                        }

                        // Look for age group/audience
                        let audience = '';
                        const audienceSelectors = ['.audience', '.age-group', '.target', '[class*="audience"]'];
                        for (const audienceSelector of audienceSelectors) {
                            const audienceElement = $el.find(audienceSelector).first();
                            if (audienceElement.length > 0) {
                                const audienceText = audienceElement.text().trim();
                                if (audienceText && audienceText.match(/\b(adults|children|teens|young adult|all ages)\b/i)) {
                                    audience = audienceText;
                                    break;
                                }
                            }
                        }

                        // Look for book signing info
                        let signing = '';
                        const signingSelectors = ['.signing', '.book-signing', '.autograph', '[class*="signing"]'];
                        for (const signingSelector of signingSelectors) {
                            const signingElement = $el.find(signingSelector).first();
                            if (signingElement.length > 0) {
                                signing = signingElement.text().trim();
                                if (signing) break;
                            }
                        }

                        // Look for registration requirement
                        let registration = '';
                        const registrationSelectors = ['.registration', '.rsvp', '.signup', '[class*="registration"]'];
                        for (const regSelector of registrationSelectors) {
                            const regElement = $el.find(regSelector).first();
                            if (regElement.length > 0) {
                                registration = regElement.text().trim();
                                if (registration) break;
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
                            date: dateTime || 'Check website for literary event schedule',
                            category: eventType,
                            author: author,
                            bookTitle: bookTitle,
                            genre: genre,
                            cost: cost,
                            moderator: moderator,
                            audience: audience,
                            signing: signing,
                            registration: registration,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCBookLiteraryEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general book/literary information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasBookKeywords = text.match(/\b(book|author|reading|literary|poetry|writing|novel|memoir|biography)\b/i);
                    const hasEventPattern = text.match(/\b(event|reading|signing|launch|discussion|workshop|club|festival)\b/i);

                    if (hasBookKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for literary event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCBookLiteraryEvents'
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

        // Check for valid book/literary keywords
        const validKeywords = [
            'book', 'author', 'reading', 'literary', 'poetry', 'writing',
            'novel', 'memoir', 'biography', 'event', 'signing', 'launch',
            'discussion', 'workshop', 'club', 'festival', 'bookstore'
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
  const scraper = new NYCBookLiteraryEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCBookLiteraryEvents = NYCBookLiteraryEvents;