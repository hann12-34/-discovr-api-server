/**
 * NYC Tech Meetups Events Scraper
 *
 * Scrapes events from NYC tech meetups and networking events
 * URL: https://www.meetup.com/find/?keywords=tech&location=us--ny--new_york
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCTechMeetupsEvents {
    constructor() {
        this.venueName = 'NYC Tech Meetups';
        this.venueLocation = 'Various NYC Tech Venues';
        this.baseUrl = 'https://www.meetup.com';
        this.eventsUrl = 'https://www.meetup.com/find/?keywords=tech&location=us--ny--new_york';
        this.category = 'Tech Meetups & Networking';
    }

    /**
     * Scrape events from NYC Tech Meetups
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`💻 Scraping events from ${this.venueName}...`);

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

            // Look for tech meetup-specific event containers
            const eventSelectors = [
                '.tech-event', '.meetup-event', '.networking-event',
                '.event-item', '.event-card', '.event', '.group-event',
                '[class*="tech"]', '[class*="meetup"]', '[class*="event"]',
                '.card', '.content-card', '.developer-event', '.startup-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .meetup-title, .name, .headline').first().text().trim();

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
                        const locationSelectors = ['.location', '.venue', '.where', '[class*="location"]', '.address'];
                        for (const locSelector of locationSelectors) {
                            const locElement = $el.find(locSelector).first();
                            if (locElement.length > 0) {
                                const locText = locElement.text().trim();
                                if (locText && locText.length > 0) {
                                    venue = locText.length > 80 ? locText.substring(0, 80) + '...' : locText;
                                    break;
                                }
                            }
                        }

                        // Look for tech topic/focus
                        let techTopic = '';
                        const topicSelectors = ['.topic', '.technology', '.focus', '[class*="topic"]'];
                        for (const topicSelector of topicSelectors) {
                            const topicElement = $el.find(topicSelector).first();
                            if (topicElement.length > 0) {
                                techTopic = topicElement.text().trim();
                                if (techTopic) break;
                            }
                        }

                        // Look for speaker/presenter
                        let speaker = '';
                        const speakerSelectors = ['.speaker', '.presenter', '.host', '[class*="speaker"]'];
                        for (const speakerSelector of speakerSelectors) {
                            const speakerElement = $el.find(speakerSelector).first();
                            if (speakerElement.length > 0) {
                                speaker = speakerElement.text().trim();
                                if (speaker) break;
                            }
                        }

                        // Look for meetup group
                        let group = '';
                        const groupSelectors = ['.group', '.organizer', '.community', '[class*="group"]'];
                        for (const groupSelector of groupSelectors) {
                            const groupElement = $el.find(groupSelector).first();
                            if (groupElement.length > 0) {
                                group = groupElement.text().trim();
                                if (group) break;
                            }
                        }

                        // Look for event type
                        let eventType = this.category;
                        const typeSelectors = ['.type', '.category', '.format', '[class*="type"]'];
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

                        // Look for attendance/RSVP count
                        let attendance = '';
                        const attendanceSelectors = ['.attendance', '.rsvp', '.going', '[class*="attendance"]'];
                        for (const attendanceSelector of attendanceSelectors) {
                            const attendanceElement = $el.find(attendanceSelector).first();
                            if (attendanceElement.length > 0) {
                                const attendanceText = attendanceElement.text().trim();
                                if (attendanceText && attendanceText.match(/\d+/)) {
                                    attendance = attendanceText;
                                    break;
                                }
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
                            date: dateTime || 'Check website for meetup schedule',
                            category: eventType,
                            techTopic: techTopic,
                            speaker: speaker,
                            group: group,
                            attendance: attendance,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCTechMeetupsEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general tech meetup information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasTechKeywords = text.match(/\b(tech|technology|developer|programming|startup|AI|machine learning|blockchain|web development|mobile|data)\b/i);
                    const hasMeetupPattern = text.match(/\b(meetup|networking|event|talk|presentation|workshop|conference)\b/i);

                    if (hasTechKeywords && hasMeetupPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for meetup schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCTechMeetupsEvents'
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
     * Remove duplicate events based on title and date
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.date}`.toLowerCase();
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
            'click here', 'find out', 'discover', 'directions'
        ];

        // Check for valid tech meetup keywords
        const validKeywords = [
            'tech', 'technology', 'developer', 'programming', 'startup',
            'meetup', 'networking', 'AI', 'machine learning', 'blockchain',
            'web development', 'mobile', 'data', 'workshop', 'conference'
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
  const scraper = new NYCTechMeetupsEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCTechMeetupsEvents = NYCTechMeetupsEvents;