/**
 * NYC Environmental & Sustainability Events Scraper
 *
 * Scrapes environmental and sustainability events from NYC green organizations and eco-friendly activities
 * URL: https://www.eventbrite.com/d/ny--new-york/environment-sustainability/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCEnvironmentalSustainabilityEvents {
    constructor() {
        this.venueName = 'NYC Environmental & Sustainability Events';
        this.venueLocation = 'Various NYC Green Spaces & Environmental Centers';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/environment-sustainability/';
        this.category = 'Environmental & Sustainability';
    }

    /**
     * Scrape events from NYC Environmental & Sustainability Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🌱 Scraping events from ${this.venueName}...`);

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

            // Look for environmental-specific event containers
            const eventSelectors = [
                '.environmental-event', '.sustainability-event', '.green-event',
                '.event-item', '.event-card', '.event', '.eco-event',
                '[class*="environmental"]', '[class*="sustainability"]', '[class*="event"]',
                '.card', '.content-card', '.climate-event', '.conservation-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .green-title, .name, .headline').first().text().trim();

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
                        const venueSelectors = ['.venue', '.location', '.park', '[class*="venue"]', '.center', '.garden'];
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

                        // Look for environmental focus/topic
                        let focus = this.category;
                        const focusSelectors = ['.focus', '.topic', '.theme', '[class*="focus"]'];
                        for (const focusSelector of focusSelectors) {
                            const focusElement = $el.find(focusSelector).first();
                            if (focusElement.length > 0) {
                                const focusText = focusElement.text().trim();
                                if (focusText && focusText.length > 0) {
                                    focus = focusText;
                                    break;
                                }
                            }
                        }

                        // Look for organization/host
                        let organization = '';
                        const orgSelectors = ['.organization', '.host', '.sponsor', '[class*="organization"]'];
                        for (const orgSelector of orgSelectors) {
                            const orgElement = $el.find(orgSelector).first();
                            if (orgElement.length > 0) {
                                organization = orgElement.text().trim();
                                if (organization) break;
                            }
                        }

                        // Look for activity type
                        let activityType = '';
                        const activitySelectors = ['.activity-type', '.event-type', '.action', '[class*="activity"]'];
                        for (const activitySelector of activitySelectors) {
                            const activityElement = $el.find(activitySelector).first();
                            if (activityElement.length > 0) {
                                const activityText = activityElement.text().trim();
                                if (activityText && activityText.match(/\b(cleanup|planting|workshop|seminar|march|rally|volunteer)\b/i)) {
                                    activityType = activityText;
                                    break;
                                }
                            }
                        }

                        // Look for supplies needed
                        let supplies = '';
                        const suppliesSelectors = ['.supplies', '.bring', '.equipment', '[class*="supplies"]'];
                        for (const suppliesSelector of suppliesSelectors) {
                            const suppliesElement = $el.find(suppliesSelector).first();
                            if (suppliesElement.length > 0) {
                                supplies = suppliesElement.text().trim();
                                if (supplies) break;
                            }
                        }

                        // Look for age restrictions
                        let ageRestriction = '';
                        const ageSelectors = ['.age-restriction', '.age-limit', '.family-friendly', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                ageRestriction = ageElement.text().trim();
                                if (ageRestriction) break;
                            }
                        }

                        // Look for cost/donation
                        let cost = '';
                        const costSelectors = ['.cost', '.donation', '.fee', '[class*="cost"]'];
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

                        // Look for impact/goals
                        let impact = '';
                        const impactSelectors = ['.impact', '.goals', '.outcome', '[class*="impact"]'];
                        for (const impactSelector of impactSelectors) {
                            const impactElement = $el.find(impactSelector).first();
                            if (impactElement.length > 0) {
                                impact = impactElement.text().trim();
                                if (impact) break;
                            }
                        }

                        // Look for registration requirement
                        let registration = '';
                        const registrationSelectors = ['.registration', '.signup', '.volunteer-signup', '[class*="registration"]'];
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
                            date: dateTime || 'Check website for environmental event schedule',
                            category: focus,
                            organization: organization,
                            activityType: activityType,
                            supplies: supplies,
                            ageRestriction: ageRestriction,
                            cost: cost,
                            impact: impact,
                            registration: registration,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCEnvironmentalSustainabilityEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general environmental information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasEnvironmentalKeywords = text.match(/\b(environmental|sustainability|green|eco|climate|conservation|recycling|renewable)\b/i);
                    const hasEventPattern = text.match(/\b(event|cleanup|workshop|seminar|march|rally|volunteer|action|initiative)\b/i);

                    if (hasEnvironmentalKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for environmental event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCEnvironmentalSustainabilityEvents'
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

        // Check for valid environmental keywords
        const validKeywords = [
            'environmental', 'sustainability', 'green', 'eco', 'climate', 'conservation',
            'recycling', 'renewable', 'event', 'cleanup', 'workshop', 'seminar',
            'march', 'rally', 'volunteer', 'action', 'initiative', 'nature'
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
  const scraper = new NYCEnvironmentalSustainabilityEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCEnvironmentalSustainabilityEvents = NYCEnvironmentalSustainabilityEvents;