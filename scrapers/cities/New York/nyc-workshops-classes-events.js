/**
 * NYC Workshops & Classes Events Scraper
 *
 * Scrapes workshop and class events from NYC studios, learning centers, and educational venues
 * URL: https://www.eventbrite.com/d/ny--new-york/classes/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCWorkshopsClassesEvents {
    constructor() {
        this.venueName = 'NYC Workshops & Classes Events';
        this.venueLocation = 'Various NYC Studios, Learning Centers & Educational Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/classes/';
        this.category = 'Workshops & Classes';
    }

    /**
     * Scrape events from NYC Workshops & Classes Events
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

            // Look for workshop/class-specific event containers
            const eventSelectors = [
                '.workshop-event', '.class-event', '.course-event',
                '.event-item', '.event-card', '.event', '.training-event',
                '[class*="workshop"]', '[class*="class"]', '[class*="event"]',
                '.card', '.content-card', '.lesson-event', '.tutorial-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .class-title, .name, .headline').first().text().trim();

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
                            'time', '.when', '.schedule', '.event-time', '.class-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/studio/learning center
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.studio', '.learning-center', '[class*="venue"]', '.location', '.classroom'];
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

                        // Look for skill/subject area
                        let subject = this.category;
                        const subjectSelectors = ['.subject', '.skill', '.topic', '[class*="subject"]'];
                        for (const subjectSelector of subjectSelectors) {
                            const subjectElement = $el.find(subjectSelector).first();
                            if (subjectElement.length > 0) {
                                const subjectText = subjectElement.text().trim();
                                if (subjectText && subjectText.length > 0) {
                                    subject = subjectText;
                                    break;
                                }
                            }
                        }

                        // Look for instructor/teacher
                        let instructor = '';
                        const instructorSelectors = ['.instructor', '.teacher', '.facilitator', '[class*="instructor"]'];
                        for (const instructorSelector of instructorSelectors) {
                            const instructorElement = $el.find(instructorSelector).first();
                            if (instructorElement.length > 0) {
                                instructor = instructorElement.text().trim();
                                if (instructor) break;
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

                        // Look for duration
                        let duration = '';
                        const durationSelectors = ['.duration', '.length', '.session-time', '[class*="duration"]'];
                        for (const durationSelector of durationSelectors) {
                            const durationElement = $el.find(durationSelector).first();
                            if (durationElement.length > 0) {
                                const durationText = durationElement.text().trim();
                                if (durationText && durationText.match(/\d+\s*(hour|min|day|week)/i)) {
                                    duration = durationText;
                                    break;
                                }
                            }
                        }

                        // Look for class size/capacity
                        let capacity = '';
                        const capacitySelectors = ['.capacity', '.class-size', '.max-students', '[class*="capacity"]'];
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

                        // Look for materials/supplies needed
                        let materials = '';
                        const materialSelectors = ['.materials', '.supplies', '.equipment', '[class*="materials"]'];
                        for (const materialSelector of materialSelectors) {
                            const materialElement = $el.find(materialSelector).first();
                            if (materialElement.length > 0) {
                                materials = materialElement.text().trim();
                                if (materials) break;
                            }
                        }

                        // Look for cost/price
                        let cost = '';
                        const costSelectors = ['.cost', '.price', '.fee', '[class*="cost"]'];
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

                        // Look for certification/completion
                        let certification = '';
                        const certSelectors = ['.certification', '.certificate', '.completion', '[class*="cert"]'];
                        for (const certSelector of certSelectors) {
                            const certElement = $el.find(certSelector).first();
                            if (certElement.length > 0) {
                                certification = certElement.text().trim();
                                if (certification) break;
                            }
                        }

                        // Look for age group/target audience
                        let ageGroup = '';
                        const ageSelectors = ['.age-group', '.target-age', '.for-ages', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                const ageText = ageElement.text().trim();
                                if (ageText && ageText.match(/\b(children|teens|adults|seniors|all ages)\b/i)) {
                                    ageGroup = ageText;
                                    break;
                                }
                            }
                        }

                        // Look for registration/booking info
                        let registration = '';
                        const regSelectors = ['.registration', '.booking', '.signup', '[class*="registration"]'];
                        for (const regSelector of regSelectors) {
                            const regElement = $el.find(regSelector).first();
                            if (regElement.length > 0) {
                                registration = regElement.text().trim();
                                if (registration) break;
                            }
                        }

                        // Look for takeaways/what you'll learn
                        let takeaways = '';
                        const takeawaySelectors = ['.takeaways', '.what-you-learn', '.outcomes', '[class*="takeaway"]'];
                        for (const takeawaySelector of takeawaySelectors) {
                            const takeawayElement = $el.find(takeawaySelector).first();
                            if (takeawayElement.length > 0) {
                                takeaways = takeawayElement.text().trim();
                                if (takeaways) break;
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
                            date: dateTime || 'Check website for workshop/class schedule',
                            category: subject,
                            instructor: instructor,
                            skillLevel: skillLevel,
                            duration: duration,
                            capacity: capacity,
                            materials: materials,
                            cost: cost,
                            prerequisites: prerequisites,
                            certification: certification,
                            ageGroup: ageGroup,
                            registration: registration,
                            takeaways: takeaways,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCWorkshopsClassesEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general workshop/class information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasWorkshopKeywords = text.match(/\b(workshop|class|course|lesson|training|tutorial|seminar|bootcamp)\b/i);
                    const hasEventPattern = text.match(/\b(learn|teach|instruction|skill|hands-on|practical|session)\b/i);

                    if (hasWorkshopKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for workshop/class schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCWorkshopsClassesEvents'
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

        // Check for valid workshop/class keywords
        const validKeywords = [
            'workshop', 'class', 'course', 'lesson', 'training', 'tutorial',
            'seminar', 'bootcamp', 'learn', 'teach', 'instruction', 'skill',
            'hands-on', 'practical', 'session', 'certification', 'masterclass'
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
  const scraper = new NYCWorkshopsClassesEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCWorkshopsClassesEvents = NYCWorkshopsClassesEvents;