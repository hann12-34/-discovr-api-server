/**
 * NYC Science & Technology Events Scraper
 *
 * Scrapes science and technology events from NYC museums, labs, and tech venues
 * URL: https://www.eventbrite.com/d/ny--new-york/science-technology/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCScienceTechnologyEvents {
    constructor() {
        this.venueName = 'NYC Science & Technology Events';
        this.venueLocation = 'Various NYC Museums, Labs & Tech Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/science-technology/';
        this.category = 'Science & Technology';
    }

    /**
     * Scrape events from NYC Science & Technology Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🔬 Scraping events from ${this.venueName}...`);

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

            // Look for science/tech-specific event containers
            const eventSelectors = [
                '.science-event', '.technology-event', '.tech-event',
                '.event-item', '.event-card', '.event', '.lab-event',
                '[class*="science"]', '[class*="technology"]', '[class*="event"]',
                '.card', '.content-card', '.research-event', '.innovation-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .tech-title, .name, .headline').first().text().trim();

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
                            'time', '.when', '.schedule', '.event-time', '.lab-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/lab/museum
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.lab', '.museum', '[class*="venue"]', '.location', '.facility'];
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

                        // Look for scientific field/tech category
                        let field = this.category;
                        const fieldSelectors = ['.field', '.category', '.discipline', '[class*="field"]'];
                        for (const fieldSelector of fieldSelectors) {
                            const fieldElement = $el.find(fieldSelector).first();
                            if (fieldElement.length > 0) {
                                const fieldText = fieldElement.text().trim();
                                if (fieldText && fieldText.length > 0) {
                                    field = fieldText;
                                    break;
                                }
                            }
                        }

                        // Look for scientist/researcher/speaker
                        let speaker = '';
                        const speakerSelectors = ['.speaker', '.scientist', '.researcher', '[class*="speaker"]'];
                        for (const speakerSelector of speakerSelectors) {
                            const speakerElement = $el.find(speakerSelector).first();
                            if (speakerElement.length > 0) {
                                speaker = speakerElement.text().trim();
                                if (speaker) break;
                            }
                        }

                        // Look for institution/organization
                        let institution = '';
                        const institutionSelectors = ['.institution', '.organization', '.company', '[class*="institution"]'];
                        for (const institutionSelector of institutionSelectors) {
                            const institutionElement = $el.find(institutionSelector).first();
                            if (institutionElement.length > 0) {
                                institution = institutionElement.text().trim();
                                if (institution) break;
                            }
                        }

                        // Look for skill level
                        let skillLevel = '';
                        const levelSelectors = ['.level', '.skill-level', '.difficulty', '[class*="level"]'];
                        for (const levelSelector of levelSelectors) {
                            const levelElement = $el.find(levelSelector).first();
                            if (levelElement.length > 0) {
                                const levelText = levelElement.text().trim();
                                if (levelText && levelText.match(/\b(beginner|intermediate|advanced|all levels)\b/i)) {
                                    skillLevel = levelText;
                                    break;
                                }
                            }
                        }

                        // Look for prerequisites
                        let prerequisites = '';
                        const prereqSelectors = ['.prerequisites', '.requirements', '.prereq', '[class*="prerequisites"]'];
                        for (const prereqSelector of prereqSelectors) {
                            const prereqElement = $el.find(prereqSelector).first();
                            if (prereqElement.length > 0) {
                                prerequisites = prereqElement.text().trim();
                                if (prerequisites) break;
                            }
                        }

                        // Look for materials/equipment needed
                        let materials = '';
                        const materialSelectors = ['.materials', '.equipment', '.supplies', '[class*="materials"]'];
                        for (const materialSelector of materialSelectors) {
                            const materialElement = $el.find(materialSelector).first();
                            if (materialElement.length > 0) {
                                materials = materialElement.text().trim();
                                if (materials) break;
                            }
                        }

                        // Look for certification/credits
                        let certification = '';
                        const certSelectors = ['.certification', '.credits', '.certificate', '[class*="certification"]'];
                        for (const certSelector of certSelectors) {
                            const certElement = $el.find(certSelector).first();
                            if (certElement.length > 0) {
                                certification = certElement.text().trim();
                                if (certification) break;
                            }
                        }

                        // Look for hands-on/demo info
                        let demo = '';
                        const demoSelectors = ['.demo', '.hands-on', '.demonstration', '[class*="demo"]'];
                        for (const demoSelector of demoSelectors) {
                            const demoElement = $el.find(demoSelector).first();
                            if (demoElement.length > 0) {
                                demo = demoElement.text().trim();
                                if (demo) break;
                            }
                        }

                        // Look for registration/capacity
                        let capacity = '';
                        const capacitySelectors = ['.capacity', '.seats', '.spots', '[class*="capacity"]'];
                        for (const capacitySelector of capacitySelectors) {
                            const capacityElement = $el.find(capacitySelector).first();
                            if (capacityElement.length > 0) {
                                const capacityText = capacityElement.text().trim();
                                if (capacityText && capacityText.match(/\d+/)) {
                                    capacity = capacityText;
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
                            date: dateTime || 'Check website for science/tech event schedule',
                            category: field,
                            speaker: speaker,
                            institution: institution,
                            skillLevel: skillLevel,
                            prerequisites: prerequisites,
                            materials: materials,
                            certification: certification,
                            demo: demo,
                            capacity: capacity,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCScienceTechnologyEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general science/tech information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasSciTechKeywords = text.match(/\b(science|technology|research|innovation|lab|experiment|discovery|tech|AI|robotics|biotech)\b/i);
                    const hasEventPattern = text.match(/\b(event|workshop|seminar|conference|lab|demo|exhibition|lecture|symposium)\b/i);

                    if (hasSciTechKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for science/tech event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCScienceTechnologyEvents'
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

        // Check for valid science/tech keywords
        const validKeywords = [
            'science', 'technology', 'research', 'innovation', 'lab',
            'experiment', 'discovery', 'tech', 'AI', 'robotics', 'biotech',
            'event', 'workshop', 'seminar', 'conference', 'demo', 'exhibition'
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
  const scraper = new NYCScienceTechnologyEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCScienceTechnologyEvents = NYCScienceTechnologyEvents;