const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Calgary Centre for Performing Arts Event Scraper
 * Major performing arts venue in downtown Calgary
 * Website: https://artscommons.ca/events
 */
class CalgaryArtsCommonsEvents {
    constructor() {
        this.name = 'Arts Commons Calgary';
        this.eventsUrl = 'https://www.werklundcentre.ca/events';
        this.source = 'arts-commons-calgary';
        this.city = 'Calgary';
        this.province = 'Alberta';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎭 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for Arts Commons event patterns
            $('.event, .show, .performance, article, .production, [class*="event"]').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    if (!text || text.length < 15) return;
                    
                    const lowercaseText = text.toLowerCase();
                    
                    // Look for event patterns with Arts Commons specific content
                    if (this.containsEventIndicators(lowercaseText) && 
                        !this.isNonEventContent(lowercaseText)) {
                        
                        // Extract event information from text blocks
                        const lines = text.split('\n').filter(line => line.trim().length > 3);
                        
                        let eventTitle = '';
                        let eventDate = '';
                        let description = '';
                        
                        // Parse Arts Commons event structure
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            const lowercaseLine = line.toLowerCase();
                            
                            // Skip navigation and non-event lines
                            if (this.isNavigationText(lowercaseLine)) continue;
                            
                            // Look for event titles (usually the first meaningful line)
                            if (this.looksLikeEventTitle(line) && eventTitle === '') {
                                eventTitle = this.cleanEventTitle(line);
                            }
                            
                            // Look for dates
                            else if (this.containsDate(line) && eventDate === '') {
                                eventDate = line;
                            }
                            
                            // Look for descriptions
                            else if (line.length > 30 && line.length < 200 && 
                                     !this.isNavigationText(lowercaseLine) &&
                                     description === '') {
                                description = line;
                            }
                        }
                        
                        if (!eventTitle || eventTitle.length < 5) return;
                        
                        const eventData = {
                            id: uuidv4(),
                            name: eventTitle,
                            title: eventTitle,
                            description: description && description.length > 20 ? description : `${title} - ${eventTitle} at Arts Commons Calgary`,
                            date: this.parseDate(eventDate),
                            venue: { name: this.extractVenueInfo().name, city: 'Calgary' },
                            city: this.city,
                            province: this.province,
                            price: 'Check Arts Commons website for pricing',
                            category: this.determineCategory(eventTitle),
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        // Skip events without real dates
                        if (!eventData.date) return;
                        
                        if (this.isEventLive(eventData.date)) {
                            // Extract date

                            const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();


                            events.push(eventData);
                        }
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            // Filter out junk/UI elements
            const filteredEvents = filterEvents(uniqueEvents);
            
            console.log(`🎭 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    containsEventIndicators(lowercaseText) {
        return (lowercaseText.includes('tickets') ||
                lowercaseText.includes('arts commons') ||
                lowercaseText.includes('performance') ||
                lowercaseText.includes('show') ||
                lowercaseText.includes('concert') ||
                lowercaseText.includes('theatre') ||
                lowercaseText.includes('opera') ||
                lowercaseText.includes('ballet') ||
                lowercaseText.includes('symphony')) &&
               (lowercaseText.includes('2025') || lowercaseText.includes('2026'));
    }

    isNonEventContent(lowercaseText) {
        return lowercaseText.includes('donate') ||
               lowercaseText.includes('newsletter') ||
               lowercaseText.includes('privacy') ||
               lowercaseText.includes('terms') ||
               lowercaseText.includes('about us') ||
               lowercaseText.includes('©') ||
               lowercaseText.length < 15;
    }

    looksLikeEventTitle(text) {
        const lowerText = text.toLowerCase();
        
        return !lowerText.includes('buy tickets') &&
               !lowerText.includes('arts commons') &&
               !lowerText.includes('downtown calgary') &&
               !lowerText.includes('newsletter') &&
               !lowerText.includes('subscribe') &&
               text.length > 5 &&
               text.length < 120;
    }

    cleanEventTitle(title) {
        let cleaned = title.trim();
        
        // Remove common prefixes that aren't part of the actual event name
        cleaned = cleaned.replace(/^Event:\s*/i, '').trim();
        cleaned = cleaned.replace(/^Show:\s*/i, '').trim();
        
        if (cleaned.length < 3) return title;
        return cleaned;
    }

    isNavigationText(lowercaseText) {
        return lowercaseText.includes('buy tickets') ||
               lowercaseText.includes('subscribe') ||
               lowercaseText.includes('newsletter') ||
               lowercaseText.includes('contact') ||
               lowercaseText.includes('about');
    }

    containsDate(text) {
        return /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) ||
               /\w{3}\s+\d{1,2}/.test(text) ||
               text.includes('2025') || text.includes('2026') ||
               text.includes('PM') || text.includes('AM');
    }

    parseDate(dateString) {
        if (!dateString) return null;

        try {
            const cleanDate = dateString.replace(/[^\w\s\-\/:.]/g, '').trim();
            const parsedDate = new Date(cleanDate);
            
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now()) {
                return parsedDate;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // REMOVED: generateFutureDate() - no fake dates allowed

    determineCategory(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('orchestra') || lowerTitle.includes('symphony') ||
            lowerTitle.includes('philharmonic')) {
            return 'Classical Music';
        } else if (lowerTitle.includes('opera')) {
            return 'Opera';
        } else if (lowerTitle.includes('ballet') || lowerTitle.includes('dance')) {
            return 'Dance';
        } else if (lowerTitle.includes('theatre') || lowerTitle.includes('play')) {
            return 'Theatre';
        } else if (lowerTitle.includes('comedy') || lowerTitle.includes('comedian')) {
            return 'Comedy';
        } else if (lowerTitle.includes('concert') || lowerTitle.includes('music')) {
            return 'Concert';
        }
        return 'Performing Arts';
    }

    extractVenueInfo() {
        return {
            name: 'Arts Commons Calgary',
            address: '205 8 Ave SE, Calgary, AB T2G 0K9',
            city: this.city,
            province: this.province,
            latitude: 51.0447,
            longitude: -114.0593
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
module.exports = async function scrapeCalgaryArtsCommonsEvents() {
    const scraper = new CalgaryArtsCommonsEvents();
    return await scraper.scrapeEvents();
};
