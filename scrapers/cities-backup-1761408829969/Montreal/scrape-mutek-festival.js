const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * MUTEK Festival Montreal Event Scraper
 * International Festival of Digital Creativity and Electronic Music
 * Website: https://montreal.mutek.org
 */
class MutekFestivalEvents {
    constructor() {
        this.name = 'MUTEK Festival';
        this.eventsUrl = 'https://montreal.mutek.org/en/schedule/program';
        this.welcomeUrl = 'https://montreal.mutek.org/en/welcome';
        this.source = 'mutek-festival';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎵 Scraping events from ${this.source}...`);

            // Try to scrape from both schedule and welcome pages
            const events = [];
            
            // Scrape schedule page
            try {
                const scheduleResponse = await axios.get(this.eventsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $schedule = cheerio.load(scheduleResponse.data);
                const scheduleEvents = this.extractEventsFromSchedule($schedule);
                events.push(...scheduleEvents);
            } catch (error) {
                console.log(`⚠️ Could not fetch schedule page: ${error.message}`);
            }

            // Scrape welcome page for general festival info
            try {
                const welcomeResponse = await axios.get(this.welcomeUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 30000
                });

                const $welcome = cheerio.load(welcomeResponse.data);
                const welcomeEvents = this.extractEventsFromWelcome($welcome);
                events.push(...welcomeEvents);
            } catch (error) {
                console.log(`⚠️ Could not fetch welcome page: ${error.message}`);
            }

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    extractEventsFromSchedule($) {
        const events = [];

        // Look for any text that might contain MUTEK event information
        $('*').each((index, element) => {
            try {
                const $element = $(element);
                const text = $element.text().trim();

                if (!text || text.length < 10) return;

                // Look for MUTEK-specific event patterns
                const lowercaseText = text.toLowerCase();
                if (lowercaseText.includes('experience') && lowercaseText.includes('august') ||
                    lowercaseText.includes('mutek') && lowercaseText.includes('2025') ||
                    lowercaseText.includes('festival') && lowercaseText.includes('electronic') ||
                    lowercaseText.includes('digital') && lowercaseText.includes('creativity') ||
                    lowercaseText.includes('esplanade') ||
                    lowercaseText.includes('lattice') ||
                    lowercaseText.includes('forum')) {

                    // Skip if it's clearly non-event content
                    if (this.isNonEventContent(lowercaseText)) return;

                    // Extract meaningful title
                    let title = text.split('\n')[0].trim();
                    if (title.length > 200) {
                        title = title.substring(0, 200) + '...';
                    }
                    if (title.length < 10) return;

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: `MUTEK Festival event: ${title}`,
                        date: new Date('2025-08-19'), // Default to festival start date
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check MUTEK website for pricing',
                        category: 'Electronic Music',
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                }
            } catch (error) {
                console.log(`❌ Error extracting schedule event ${index + 1}:`, error.message);
            }
        });

        return filterEvents(events);
    }

    extractEventsFromWelcome($) {
        const events = [];

        // Look for any text content that mentions MUTEK events or artists
        $('*').each((index, element) => {
            try {
                const $element = $(element);
                const text = $element.text().trim();

                if (!text || text.length < 15) return;

                const lowercaseText = text.toLowerCase();
                
                // Look for MUTEK event indicators
                if ((lowercaseText.includes('mutek') || 
                     lowercaseText.includes('festival') || 
                     lowercaseText.includes('forum') ||
                     lowercaseText.includes('village numérique') ||
                     lowercaseText.includes('digital creativity') ||
                     lowercaseText.includes('electronic music')) &&
                    (lowercaseText.includes('2025') || 
                     lowercaseText.includes('august') ||
                     lowercaseText.includes('edition'))) {

                    if (this.isNonEventContent(lowercaseText)) return;

                    // Extract meaningful title
                    let title = text.split('\n')[0].trim();
                    if (title.length > 200) {
                        title = title.substring(0, 197) + '...';
                    }
                    if (title.length < 15) return;

                    // Determine event date based on content
                    let eventDate = new Date('2025-08-19'); // Default festival start
                    if (lowercaseText.includes('forum')) {
                        eventDate = new Date('2025-08-20');
                    } else if (lowercaseText.includes('village')) {
                        eventDate = new Date('2025-08-14');
                    }

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: `MUTEK Montreal 2025: ${title}`,
                        date: eventDate,
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check MUTEK website for pricing',
                        category: 'Electronic Music',
                        source: this.source,
                        url: this.welcomeUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                }
            } catch (error) {
                console.log(`❌ Error extracting welcome event ${index + 1}:`, error.message);
            }
        });

        return filterEvents(events);
    }

    isNonEventContent(lowercaseTitle) {
        return lowercaseTitle.includes('cookie') || 
               lowercaseTitle.includes('newsletter') ||
               lowercaseTitle.includes('menu') ||
               lowercaseTitle.includes('contact') ||
               lowercaseTitle.includes('about') ||
               lowercaseTitle.includes('subscribe') ||
               lowercaseTitle.includes('festival schedule') ||
               lowercaseTitle.includes('download') ||
               lowercaseTitle.includes('timetable') ||
               lowercaseTitle.includes('welcome to') ||
               lowercaseTitle.includes('international festival') ||
               lowercaseTitle.includes('details') ||
               lowercaseTitle.includes('sold out') ||
               lowercaseTitle.includes('free') ||
               lowercaseTitle.includes('©') ||
               lowercaseTitle.length < 10;
    }

    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Handle MUTEK specific date formats
            const cleanDate = dateString.replace(/[^\w\s\-\/:.]/g, '').trim();
            
            // Handle specific date formats like "Tuesday, August 19, 2025"
            if (cleanDate.includes('August') && cleanDate.includes('2025')) {
                const parsedDate = new Date(cleanDate);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate;
                }
            }
            
            // Try to parse the date normally
            const parsedDate = new Date(cleanDate);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
                return parsedDate;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    extractVenueInfo(venueText) {
        const baseVenue = {
            name: 'MUTEK Festival Venues',
            city: this.city,
            province: this.province,
            latitude: 45.5017,
            longitude: -73.5673
        };

        if (venueText) {
            if (venueText.toLowerCase().includes('esplanade tranquille')) {
                return {
                    ...baseVenue,
                    name: 'Esplanade Tranquille',
                    address: 'Quartier des Spectacles, Montreal, QC'
                };
            } else if (venueText.toLowerCase().includes('sat')) {
                return {
                    ...baseVenue,
                    name: 'Société des arts technologiques (SAT)',
                    address: '1201 Boul Saint-Laurent, Montreal, QC'
                };
            }
        }

        return {
            ...baseVenue,
            address: 'Various venues in Quartier des Spectacles, Montreal, QC'
        };
    }

    isEventLive(eventDate) {
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        return eventDate >= now && eventDate <= oneYearFromNow;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase()}-${event.date.toDateString()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export the scraper function
module.exports = async function scrapeMutekFestivalEvents() {
    const scraper = new MutekFestivalEvents();
    return await scraper.scrapeEvents();
};
