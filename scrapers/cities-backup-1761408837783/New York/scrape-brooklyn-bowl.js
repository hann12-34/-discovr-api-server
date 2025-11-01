const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Brooklyn Bowl NYC Event Scraper
 * Music venue and bowling alley in Williamsburg, Brooklyn
 * Website: https://www.brooklynbowl.com/brooklyn/shows/all
 */
class BrooklynBowlEvents {
    constructor() {
        this.name = 'Brooklyn Bowl';
        this.eventsUrl = 'https://www.brooklynbowl.com/brooklyn/shows/all';
        this.source = 'brooklyn-bowl';
        this.city = 'New York';
        this.province = 'New York';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎳 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for Brooklyn Bowl events - use specific selectors, NOT $('*')
            $('.event, .show, .concert, article, .card, .listing, [data-event]').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    if (!text || text.length < 10) return;
                    
                    const lowercaseText = text.toLowerCase();
                    
                    // Look for event patterns with Brooklyn Bowl specific content
                    if (this.containsEventIndicators(lowercaseText) && 
                        !this.isNonEventContent(lowercaseText)) {
                        
                        // Extract event information from text blocks
                        const lines = text.split('\n').filter(line => line.trim().length > 0);
                        
                        let eventTitle = '';
                        let supportingActs = '';
                        let description = '';
                        
                        // Parse Brooklyn Bowl event structure
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            const lowercaseLine = line.toLowerCase();
                            
                            // Skip navigation and non-event lines
                            if (this.isNavigationText(lowercaseLine)) continue;
                            
                            // Look for main event titles (usually the first meaningful line)
                            if (this.looksLikeEventTitle(line) && eventTitle === '') {
                                eventTitle = this.cleanEventTitle(line);
                            }
                            
                            // Look for supporting acts (often follow main acts)
                            else if (line.length > 3 && line.length < 50 && 
                                     eventTitle !== '' && supportingActs === '' &&
                                     !lowercaseLine.includes('get tickets') &&
                                     !lowercaseLine.includes('all ages') &&
                                     this.looksLikeSupportingAct(line)) {
                                supportingActs = line;
                            }
                            
                            // Look for event descriptions
                            else if (line.length > 30 && line.length < 200 && 
                                     !this.isNavigationText(lowercaseLine) &&
                                     description === '') {
                                description = line;
                            }
                        }
                        
                        if (!eventTitle || eventTitle.length < 3) return;
                        
                        // Combine title with supporting acts if available
                        const fullTitle = supportingActs ? 
                            `${eventTitle} with ${supportingActs}` : eventTitle;
                        
                        // Try to extract real date from element
                        const dateText = $element.find('.date, .event-date, time, .when').text().trim();
                        const parsedDate = this.parseDate(dateText);
                        
                        // Skip events without real dates - NO FAKE DATES
                        if (!parsedDate) return;
                        
                        const eventData = {
                            id: uuidv4(),
                            name: fullTitle,
                            title: fullTitle,
                            description: description && description.length > 20 ? description : `${fullTitle} at Brooklyn Bowl - Music venue and bowling alley in Williamsburg`,
                            date: parsedDate,
                            venue: { name: this.extractVenueInfo().name, address: '61 Wythe Avenue, Brooklyn, NY 11249', city: 'New York' },
                            city: this.city,
                            province: this.province,
                            price: 'Check Brooklyn Bowl website for pricing',
                            category: this.determineCategory(eventTitle),
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        if (this.isEventLive(eventData.date)) {
                            events.push(eventData);
                        }
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            
            // Filter out junk/UI elements using eventFilter
            const filteredEvents = filterEvents(uniqueEvents);
            
            console.log(`🎉 Successfully scraped ${filteredEvents.length} events from ${this.source}`);
            return filteredEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    containsEventIndicators(lowercaseText) {
        return (lowercaseText.includes('get tickets') ||
                lowercaseText.includes('brooklyn bowl') ||
                lowercaseText.includes('upcoming events') ||
                lowercaseText.includes('events list') ||
                lowercaseText.includes('tour') ||
                lowercaseText.includes('band') ||
                lowercaseText.includes('concert') ||
                lowercaseText.includes('show') ||
                lowercaseText.includes('music')) &&
               !lowercaseText.includes('closed');
    }

    isNonEventContent(lowercaseText) {
        return lowercaseText.includes('brooklyn bowl will be closed') ||
               lowercaseText.includes('closed for a private event') ||
               lowercaseText.includes('gift card') ||
               lowercaseText.includes('newsletter') ||
               lowercaseText.includes('privacy') ||
               lowercaseText.includes('terms') ||
               lowercaseText.includes('©') ||
               lowercaseText.length < 10;
    }

    looksLikeEventTitle(text) {
        const lowerText = text.toLowerCase();
        
        // Check for artist names, band names, or event titles
        return !lowerText.includes('get tickets') &&
               !lowerText.includes('brooklyn bowl') &&
               !lowerText.includes('upcoming events') &&
               !lowerText.includes('events list') &&
               !lowerText.includes('all ages') &&
               !lowerText.includes('closed') &&
               !lowerText.includes('private event') &&
               text.length > 5 &&
               text.length < 100 &&
               (lowerText.includes('tour') || 
                lowerText.includes('band') ||
                lowerText.includes('experience') ||
                lowerText.includes('night') ||
                lowerText.includes('party') ||
                lowerText.includes('playhouse') ||
                lowerText.includes('presents') ||
                this.looksLikeArtistName(text));
    }

    looksLikeArtistName(text) {
        const lowerText = text.toLowerCase();
        
        // Common patterns for artist/band names
        return !lowerText.includes('www.') &&
               !lowerText.includes('.com') &&
               !lowerText.includes('http') &&
               !lowerText.includes('get tickets') &&
               text.length > 3 &&
               text.length < 60;
    }

    looksLikeSupportingAct(text) {
        const lowerText = text.toLowerCase();
        
        // Supporting acts are usually shorter and don't contain certain keywords
        return !lowerText.includes('get tickets') &&
               !lowerText.includes('brooklyn bowl') &&
               !lowerText.includes('will be closed') &&
               !lowerText.includes('all ages') &&
               text.length > 3 &&
               text.length < 40;
    }

    cleanEventTitle(title) {
        // Clean up Brooklyn Bowl event titles
        let cleaned = title.trim();
        
        // Remove common prefixes that aren't part of the actual event name
        cleaned = cleaned.replace(/^### /, '').trim();
        cleaned = cleaned.replace(/^\[/, '').replace(/\]$/, '').trim();
        
        if (cleaned.length < 3) return title;
        return cleaned;
    }

    isNavigationText(lowercaseText) {
        return lowercaseText.includes('get tickets') ||
               lowercaseText.includes('upcoming events') ||
               lowercaseText.includes('events list') ||
               lowercaseText.includes('brooklyn bowl will be closed') ||
               lowercaseText.includes('all ages until') ||
               lowercaseText.includes('closed for a private event');
    }

    // REMOVED: generateFutureDate() - no fake dates allowed

    determineCategory(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('comedy') || lowerTitle.includes('comedian')) {
            return 'Comedy';
        } else if (lowerTitle.includes('kpop') || lowerTitle.includes('k-pop')) {
            return 'K-Pop';
        } else if (lowerTitle.includes('dance party') || lowerTitle.includes('party')) {
            return 'Dance Party';
        } else if (lowerTitle.includes('playhouse') || lowerTitle.includes('kids') ||
                   lowerTitle.includes('family') || lowerTitle.includes('children')) {
            return 'Family';
        } else if (lowerTitle.includes('bowl experience') || lowerTitle.includes('bowling')) {
            return 'Entertainment';
        } else if (lowerTitle.includes('tour') || lowerTitle.includes('band') ||
                   lowerTitle.includes('music') || lowerTitle.includes('concert')) {
            return 'Concert';
        } else if (lowerTitle.includes('jazz') || lowerTitle.includes('funk')) {
            return 'Jazz/Funk';
        } else if (lowerTitle.includes('rock') || lowerTitle.includes('indie')) {
            return 'Rock';
        }
        return 'Live Music';
    }

    extractVenueInfo() {
        return {
            name: 'Brooklyn Bowl',
            address: '61 Wythe Ave, Brooklyn, NY 11249',
            city: 'Brooklyn',
            province: this.province,
            latitude: 40.7216,
            longitude: -73.9584
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
module.exports = async function scrapeBrooklynBowlEvents() {
    const scraper = new BrooklynBowlEvents();
    return await scraper.scrapeEvents();
};
