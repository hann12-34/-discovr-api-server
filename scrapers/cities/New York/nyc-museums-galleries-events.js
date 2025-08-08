/**
 * NYC Museums & Galleries Events Scraper
 *
 * Scrapes museum and gallery events from NYC art institutions, exhibitions, and cultural venues
 * URL: https://www.eventbrite.com/d/ny--new-york/visual-arts/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCMuseumsGalleriesEvents {
    constructor() {
        this.venueName = 'NYC Museums & Galleries Events';
        this.venueLocation = 'Various NYC Museums, Galleries & Art Institutions';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/visual-arts/';
        this.category = 'Museums & Galleries';
    }

    /**
     * Scrape events from NYC Museums & Galleries Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🖼️ Scraping events from ${this.venueName}...`);

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

            // Look for museum/gallery-specific event containers
            const eventSelectors = [
                '.museum-event', '.gallery-event', '.art-event',
                '.event-item', '.event-card', '.event', '.exhibition-event',
                '[class*="museum"]', '[class*="gallery"]', '[class*="event"]',
                '.card', '.content-card', '.opening-event', '.curator-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .exhibition-title, .name, .headline').first().text().trim();

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
                            'time', '.when', '.schedule', '.event-time', '.exhibition-dates'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/museum/gallery
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.museum', '.gallery', '[class*="venue"]', '.location', '.institution'];
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

                        // Look for art movement/style
                        let artStyle = this.category;
                        const styleSelectors = ['.art-style', '.movement', '.period', '[class*="style"]'];
                        for (const styleSelector of styleSelectors) {
                            const styleElement = $el.find(styleSelector).first();
                            if (styleElement.length > 0) {
                                const styleText = styleElement.text().trim();
                                if (styleText && styleText.match(/\b(contemporary|modern|classical|abstract|impressionist|cubist|pop art)\b/i)) {
                                    artStyle = styleText;
                                    break;
                                }
                            }
                        }

                        // Look for artist/creator
                        let artist = '';
                        const artistSelectors = ['.artist', '.creator', '.painter', '[class*="artist"]'];
                        for (const artistSelector of artistSelectors) {
                            const artistElement = $el.find(artistSelector).first();
                            if (artistElement.length > 0) {
                                artist = artistElement.text().trim();
                                if (artist) break;
                            }
                        }

                        // Look for curator
                        let curator = '';
                        const curatorSelectors = ['.curator', '.curated-by', '.organized-by', '[class*="curator"]'];
                        for (const curatorSelector of curatorSelectors) {
                            const curatorElement = $el.find(curatorSelector).first();
                            if (curatorElement.length > 0) {
                                curator = curatorElement.text().trim();
                                if (curator) break;
                            }
                        }

                        // Look for exhibition type
                        let exhibitionType = '';
                        const typeSelectors = ['.exhibition-type', '.show-type', '.event-type', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.match(/\b(solo|group|retrospective|collection|permanent|temporary)\b/i)) {
                                    exhibitionType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for medium/materials
                        let medium = '';
                        const mediumSelectors = ['.medium', '.materials', '.technique', '[class*="medium"]'];
                        for (const mediumSelector of mediumSelectors) {
                            const mediumElement = $el.find(mediumSelector).first();
                            if (mediumElement.length > 0) {
                                const mediumText = mediumElement.text().trim();
                                if (mediumText && mediumText.match(/\b(oil|acrylic|watercolor|sculpture|photography|digital|mixed media)\b/i)) {
                                    medium = mediumText;
                                    break;
                                }
                            }
                        }

                        // Look for admission/entry fee
                        let admission = '';
                        const admissionSelectors = ['.admission', '.entry-fee', '.ticket-price', '[class*="admission"]'];
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

                        // Look for guided tours
                        let guidedTours = '';
                        const tourSelectors = ['.guided-tours', '.tours', '.walkthrough', '[class*="tour"]'];
                        for (const tourSelector of tourSelectors) {
                            const tourElement = $el.find(tourSelector).first();
                            if (tourElement.length > 0) {
                                guidedTours = tourElement.text().trim();
                                if (guidedTours) break;
                            }
                        }

                        // Look for special events/programming
                        let specialEvents = '';
                        const specialSelectors = ['.special-events', '.programming', '.events', '[class*="special"]'];
                        for (const specialSelector of specialSelectors) {
                            const specialElement = $el.find(specialSelector).first();
                            if (specialElement.length > 0) {
                                specialEvents = specialElement.text().trim();
                                if (specialEvents) break;
                            }
                        }

                        // Look for age recommendations
                        let ageRecommendation = '';
                        const ageSelectors = ['.age-recommendation', '.suitable-for', '.recommended-age', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                const ageText = ageElement.text().trim();
                                if (ageText && ageText.match(/\b(children|adults|families|all ages)\b/i)) {
                                    ageRecommendation = ageText;
                                    break;
                                }
                            }
                        }

                        // Look for accessibility info
                        let accessibility = '';
                        const accessSelectors = ['.accessibility', '.wheelchair-accessible', '.accessible', '[class*="access"]'];
                        for (const accessSelector of accessSelectors) {
                            const accessElement = $el.find(accessSelector).first();
                            if (accessElement.length > 0) {
                                accessibility = accessElement.text().trim();
                                if (accessibility) break;
                            }
                        }

                        // Look for audio guides/technology
                        let audioGuide = '';
                        const audioSelectors = ['.audio-guide', '.digital-guide', '.app', '[class*="audio"]'];
                        for (const audioSelector of audioSelectors) {
                            const audioElement = $el.find(audioSelector).first();
                            if (audioElement.length > 0) {
                                audioGuide = audioElement.text().trim();
                                if (audioGuide) break;
                            }
                        }

                        // Look for member benefits/discounts
                        let memberBenefits = '';
                        const memberSelectors = ['.member-benefits', '.membership', '.discounts', '[class*="member"]'];
                        for (const memberSelector of memberSelectors) {
                            const memberElement = $el.find(memberSelector).first();
                            if (memberElement.length > 0) {
                                memberBenefits = memberElement.text().trim();
                                if (memberBenefits) break;
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
                            date: dateTime || 'Check website for museum/gallery event schedule',
                            category: artStyle,
                            artist: artist,
                            curator: curator,
                            exhibitionType: exhibitionType,
                            medium: medium,
                            admission: admission,
                            guidedTours: guidedTours,
                            specialEvents: specialEvents,
                            ageRecommendation: ageRecommendation,
                            accessibility: accessibility,
                            audioGuide: audioGuide,
                            memberBenefits: memberBenefits,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCMuseumsGalleriesEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general museum/gallery information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasMuseumKeywords = text.match(/\b(museum|gallery|art|exhibition|artist|curator|collection|painting|sculpture)\b/i);
                    const hasEventPattern = text.match(/\b(exhibition|show|opening|tour|event|display|retrospective|collection)\b/i);

                    if (hasMuseumKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for museum/gallery event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCMuseumsGalleriesEvents'
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

        // Check for valid museum/gallery keywords
        const validKeywords = [
            'museum', 'gallery', 'art', 'exhibition', 'artist', 'curator',
            'collection', 'painting', 'sculpture', 'show', 'opening', 'tour',
            'event', 'display', 'retrospective', 'contemporary', 'modern'
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
  const scraper = new NYCMuseumsGalleriesEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCMuseumsGalleriesEvents = NYCMuseumsGalleriesEvents;