/**
 * NYC Film & Cinema Events Scraper
 *
 * Scrapes film and cinema events from NYC theaters, film festivals, and screening venues
 * URL: https://www.eventbrite.com/d/ny--new-york/film/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCFilmCinemaEvents {
    constructor() {
        this.venueName = 'NYC Film & Cinema Events';
        this.venueLocation = 'Various NYC Theaters, Film Festivals & Screening Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/film/';
        this.category = 'Film & Cinema';
    }

    /**
     * Scrape events from NYC Film & Cinema Events
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

            // Look for film/cinema-specific event containers
            const eventSelectors = [
                '.film-event', '.cinema-event', '.movie-event',
                '.event-item', '.event-card', '.event', '.screening-event',
                '[class*="film"]', '[class*="cinema"]', '[class*="event"]',
                '.card', '.content-card', '.festival-event', '.premiere-event'
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

                        // Look for venue/theater/cinema
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.theater', '.cinema', '[class*="venue"]', '.location', '.screening-venue'];
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

                        // Look for film genre
                        let genre = '';
                        const genreSelectors = ['.genre', '.category', '.film-type', '[class*="genre"]'];
                        for (const genreSelector of genreSelectors) {
                            const genreElement = $el.find(genreSelector).first();
                            if (genreElement.length > 0) {
                                const genreText = genreElement.text().trim();
                                if (genreText && genreText.match(/\b(drama|comedy|horror|thriller|documentary|romance|action|sci-fi)\b/i)) {
                                    genre = genreText;
                                    break;
                                }
                            }
                        }

                        // Look for director
                        let director = '';
                        const directorSelectors = ['.director', '.filmmaker', '.creator', '[class*="director"]'];
                        for (const directorSelector of directorSelectors) {
                            const directorElement = $el.find(directorSelector).first();
                            if (directorElement.length > 0) {
                                director = directorElement.text().trim();
                                if (director) break;
                            }
                        }

                        // Look for cast/actors
                        let cast = '';
                        const castSelectors = ['.cast', '.actors', '.starring', '[class*="cast"]'];
                        for (const castSelector of castSelectors) {
                            const castElement = $el.find(castSelector).first();
                            if (castElement.length > 0) {
                                cast = castElement.text().trim();
                                if (cast) break;
                            }
                        }

                        // Look for year/release date
                        let year = '';
                        const yearSelectors = ['.year', '.release-date', '.film-year', '[class*="year"]'];
                        for (const yearSelector of yearSelectors) {
                            const yearElement = $el.find(yearSelector).first();
                            if (yearElement.length > 0) {
                                const yearText = yearElement.text().trim();
                                if (yearText && yearText.match(/\b(19|20)\d{2}\b/)) {
                                    year = yearText;
                                    break;
                                }
                            }
                        }

                        // Look for rating
                        let rating = '';
                        const ratingSelectors = ['.rating', '.mpaa-rating', '.film-rating', '[class*="rating"]'];
                        for (const ratingSelector of ratingSelectors) {
                            const ratingElement = $el.find(ratingSelector).first();
                            if (ratingElement.length > 0) {
                                const ratingText = ratingElement.text().trim();
                                if (ratingText && ratingText.match(/\b(G|PG|PG-13|R|NC-17|NR|Unrated)\b/i)) {
                                    rating = ratingText;
                                    break;
                                }
                            }
                        }

                        // Look for duration
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

                        // Look for language/subtitles
                        let language = '';
                        const languageSelectors = ['.language', '.subtitles', '.audio', '[class*="language"]'];
                        for (const languageSelector of languageSelectors) {
                            const languageElement = $el.find(languageSelector).first();
                            if (languageElement.length > 0) {
                                language = languageElement.text().trim();
                                if (language) break;
                            }
                        }

                        // Look for ticket price
                        let ticketPrice = '';
                        const priceSelectors = ['.price', '.ticket-price', '.cost', '[class*="price"]'];
                        for (const priceSelector of priceSelectors) {
                            const priceElement = $el.find(priceSelector).first();
                            if (priceElement.length > 0) {
                                const priceText = priceElement.text().trim();
                                if (priceText && (priceText.includes('$') || priceText.toLowerCase().includes('free'))) {
                                    ticketPrice = priceText;
                                    break;
                                }
                            }
                        }

                        // Look for festival/event type
                        let eventType = this.category;
                        const typeSelectors = ['.event-type', '.screening-type', '.festival', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.match(/\b(premiere|screening|festival|retrospective|marathon)\b/i)) {
                                    eventType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for Q&A/special events
                        let specialEvent = '';
                        const specialSelectors = ['.special', '.q-and-a', '.discussion', '[class*="special"]'];
                        for (const specialSelector of specialSelectors) {
                            const specialElement = $el.find(specialSelector).first();
                            if (specialElement.length > 0) {
                                specialEvent = specialElement.text().trim();
                                if (specialEvent) break;
                            }
                        }

                        // Look for description/synopsis
                        let description = '';
                        const descSelectors = ['.description', '.synopsis', '.summary', '.details', '.content'];
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
                            date: dateTime || 'Check website for film screening schedule',
                            category: eventType,
                            genre: genre,
                            director: director,
                            cast: cast,
                            year: year,
                            rating: rating,
                            duration: duration,
                            language: language,
                            ticketPrice: ticketPrice,
                            specialEvent: specialEvent,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCFilmCinemaEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general film/cinema information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasFilmKeywords = text.match(/\b(film|movie|cinema|documentary|screening|premiere|festival|director|actor)\b/i);
                    const hasEventPattern = text.match(/\b(screening|premiere|festival|event|showing|retrospective|marathon|Q&A)\b/i);

                    if (hasFilmKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for film screening schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCFilmCinemaEvents'
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

        // Check for valid film/cinema keywords
        const validKeywords = [
            'film', 'movie', 'cinema', 'documentary', 'screening', 'premiere',
            'festival', 'director', 'actor', 'event', 'showing', 'retrospective',
            'marathon', 'Q&A', 'theater', 'indie', 'short', 'feature'
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
  const scraper = new NYCFilmCinemaEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCFilmCinemaEvents = NYCFilmCinemaEvents;