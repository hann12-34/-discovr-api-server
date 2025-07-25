/**
 * Modern Love Calgary Scraper
 * 
 * This scraper extracts event information from Modern Love bar's events page.
 * It identifies recurring events and special nights at this Calgary live music venue.
 */

const axios = require('axios');
const cheerio = require('cheerio');

class ModernLoveScraper {
    constructor() {
        this.baseUrl = 'https://www.modern-love.ca';
        this.targetUrl = 'https://www.modern-love.ca/events';
        this.venue = {
            name: 'Modern Love',
            address: '613 11 Ave SW',
            city: 'Calgary',
            state: 'Alberta',
            country: 'Canada',
            postalCode: 'T2R 0E1'
        };
    }

    async scrapeEvents() {
        try {
            console.log('🎵 Scraping Modern Love events...');
            
            const response = await axios.get(this.targetUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract recurring events from the page
            const eventElements = $('h2, .event-title').toArray();
            
            eventElements.forEach(element => {
                const $element = $(element);
                const title = this.cleanText($element.text());
                
                if (title && title.length > 3) {
                    const eventData = this.parseEventTitle(title);
                    
                    if (eventData) {
                        events.push({
                            title: eventData.title,
                            description: this.generateDescription(eventData),
                            venue: this.venue,
                            category: eventData.category,
                            url: this.targetUrl,
                            date: this.getNextEventDate(eventData.dayOfWeek),
                            source: 'Modern Love',
                            scrapedAt: new Date(),
                            tags: eventData.tags || []
                        });
                    }
                }
            });

            // Also extract from text content to catch all events
            const textContent = $('body').text();
            const additionalEvents = this.extractEventsFromText(textContent);
            
            additionalEvents.forEach(event => {
                if (!events.find(e => e.title === event.title)) {
                    events.push(event);
                }
            });

            // Remove duplicates
            const uniqueEvents = this.removeDuplicateEvents(events);
            
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} unique events from Modern Love`);
            return uniqueEvents;

        } catch (error) {
            console.error('❌ Error scraping Modern Love:', error.message);
            return [];
        }
    }

    extractEventsFromText(text) {
        const events = [];
        const eventPatterns = [
            {
                pattern: /MIDWEST MONDAYS/i,
                title: 'Midwest Mondays',
                description: 'Weekly live music event featuring midwest-style bands and artists.',
                category: 'Live Music',
                dayOfWeek: 1,
                tags: ['live-music', 'weekly', 'midwest']
            },
            {
                pattern: /VERSIONS.*TUESDAYS/i,
                title: 'Versions - Tuesdays',
                description: 'Patio party event with live music and entertainment. Doors at 5PM.',
                category: 'Live Music',
                dayOfWeek: 2,
                tags: ['patio', 'versions', 'weekly']
            },
            {
                pattern: /WISEGUYS TRIVIA.*WEDNESDAYS/i,
                title: 'Wiseguys Trivia - Wednesdays',
                description: 'Weekly trivia night starting at 7PM. Test your knowledge and win prizes.',
                category: 'Trivia',
                dayOfWeek: 3,
                tags: ['trivia', 'weekly', 'quiz']
            },
            {
                pattern: /2010'S NIGHT.*FRIDAYS/i,
                title: "2010's Night - Fridays",
                description: 'Dance to the best hits from the 2010s. Doors at 9PM.',
                category: 'Dance',
                dayOfWeek: 5,
                tags: ['2010s', 'dance', 'weekly']
            },
            {
                pattern: /Y2K THROWBACK NIGHT/i,
                title: 'Y2K Throwback Night',
                description: 'Nostalgic night featuring the best music from the early 2000s. Doors at 9PM.',
                category: 'Dance',
                dayOfWeek: 6,
                tags: ['y2k', 'throwback', 'dance']
            },
            {
                pattern: /TOONIE TUESDAY/i,
                title: 'Toonie Tuesday',
                description: 'Two dollar burgers available from 4PM until we run out. Great deals on food.',
                category: 'Food Special',
                dayOfWeek: 2,
                tags: ['food', 'special', 'burgers']
            }
        ];

        eventPatterns.forEach(pattern => {
            if (pattern.pattern.test(text)) {
                events.push({
                    title: pattern.title,
                    description: pattern.description,
                    venue: this.venue,
                    category: pattern.category,
                    url: this.targetUrl,
                    date: this.getNextEventDate(pattern.dayOfWeek),
                    source: 'Modern Love',
                    scrapedAt: new Date(),
                    tags: pattern.tags || []
                });
            }
        });

        return events;
    }

    parseEventTitle(title) {
        const cleanTitle = title.toUpperCase();
        
        // Map event titles to structured data
        const eventMappings = {
            'MIDWEST MONDAYS': {
                title: 'Midwest Mondays',
                category: 'Live Music',
                dayOfWeek: 1,
                tags: ['live-music', 'weekly']
            },
            'VERSIONS - TUESDAYS': {
                title: 'Versions - Tuesdays',
                category: 'Live Music',
                dayOfWeek: 2,
                tags: ['patio', 'versions']
            },
            'WISEGUYS TRIVIA - WEDNESDAYS': {
                title: 'Wiseguys Trivia - Wednesdays',
                category: 'Trivia',
                dayOfWeek: 3,
                tags: ['trivia', 'weekly']
            },
            "2010'S NIGHT - FRIDAYS": {
                title: "2010's Night - Fridays",
                category: 'Dance',
                dayOfWeek: 5,
                tags: ['2010s', 'dance']
            },
            'Y2K THROWBACK NIGHT': {
                title: 'Y2K Throwback Night',
                category: 'Dance',
                dayOfWeek: 6,
                tags: ['y2k', 'throwback']
            },
            'TOONIE TUESDAY': {
                title: 'Toonie Tuesday',
                category: 'Food Special',
                dayOfWeek: 2,
                tags: ['food', 'special']
            }
        };

        for (const [key, data] of Object.entries(eventMappings)) {
            if (cleanTitle.includes(key)) {
                return data;
            }
        }

        return null;
    }

    generateDescription(eventData) {
        const descriptions = {
            'Midwest Mondays': 'Weekly live music event featuring midwest-style bands and artists. Starts at 7PM.',
            'Versions - Tuesdays': 'Patio party event with live music and entertainment. Doors at 5PM.',
            'Wiseguys Trivia - Wednesdays': 'Weekly trivia night starting at 7PM. Test your knowledge and win prizes.',
            "2010's Night - Fridays": 'Dance to the best hits from the 2010s. Doors at 9PM.',
            'Y2K Throwback Night': 'Nostalgic night featuring the best music from the early 2000s. Doors at 9PM.',
            'Toonie Tuesday': 'Two dollar burgers available from 4PM until we run out. Great deals on food.'
        };

        return descriptions[eventData.title] || `${eventData.title} at Modern Love. Check venue for details.`;
    }

    getNextEventDate(dayOfWeek) {
        const now = new Date();
        const nextEvent = new Date(now);
        
        // Get next occurrence of the specified day
        const daysUntilEvent = (dayOfWeek - now.getDay() + 7) % 7;
        nextEvent.setDate(now.getDate() + (daysUntilEvent === 0 ? 7 : daysUntilEvent));
        
        return nextEvent;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.category}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ').replace(/[^\w\s&'-]/g, '') : '';
    }
}

module.exports = ModernLoveScraper;
