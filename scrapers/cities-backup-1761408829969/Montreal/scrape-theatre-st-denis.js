const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Théâtre St-Denis Montreal Event Scraper
 * Major theatre venue in Montreal (part of Espace St-Denis)
 * Website: https://espacestdenis.com
 */
class TheatreStDenisEvents {
    constructor() {
        this.name = 'Théâtre St-Denis';
        this.eventsUrl = 'https://espacestdenis.com/programmation/';
        this.source = 'theatre-st-denis';
        this.city = 'Montreal';
        this.province = 'Quebec';
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

            // Look for event listings on Espace St-Denis website
            $('article, .event, .show, .spectacle, .evenement, a[href*="evenement"], h2, h3, h4, .title').each((index, element) => {
                try {
                    const $element = $(element);
                    let text = $element.text().trim();
                    
                    if (!text || text.length < 10) return;
                    
                    // Look specifically for events at Théâtre St-Denis (not Studio-Cabaret)
                    if (!text.toLowerCase().includes('théâtre st-denis') && 
                        !text.toLowerCase().includes('theater st-denis') &&
                        !text.toLowerCase().includes('theatre st denis')) return;
                    
                    // Extract event details from the text patterns
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    let eventTitle = '';
                    let eventSubtitle = '';
                    let eventDate = '';
                    let eventCategory = '';
                    
                    // Parse the structured event information
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].toLowerCase();
                        
                        if (line.includes('humour') || line.includes('music') || 
                            line.includes('musique') || line.includes('variété')) {
                            eventCategory = lines[i];
                        } else if (line.includes('2025') || line.includes('2026')) {
                            eventDate = lines[i];
                        } else if (line.includes('théâtre st-denis')) {
                            // Skip venue line
                            continue;
                        } else if (eventTitle === '' && lines[i].length > 5 && lines[i].length < 100) {
                            eventTitle = lines[i];
                        } else if (eventSubtitle === '' && lines[i].length > 5 && lines[i].length < 150) {
                            eventSubtitle = lines[i];
                        }
                    }
                    
                    if (!eventTitle || eventTitle.toLowerCase().includes('billets')) return;
                    
                    // Filter out common non-event content
                    const lowercaseTitle = eventTitle.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('tous les événements') ||
                        lowercaseTitle.includes('programmation') ||
                        lowercaseTitle.includes('billets') ||
                        lowercaseTitle.includes('©')) return;

                    const fullTitle = eventSubtitle ? `${eventTitle} - ${eventSubtitle}` : eventTitle;

                    const eventData = {
                        id: uuidv4(),
                        name: fullTitle,
                        title: fullTitle,
                        description: `${fullTitle} at Théâtre St-Denis Montreal`,
                        date: this.parseDate(eventDate),
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check website for pricing',
                        category: this.determineCategory(eventCategory, eventTitle),
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    // Skip events without real dates
                    if (!eventData.date) return;
                    
                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
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

    // REMOVED: generateFutureDate() - no fake dates allowed

    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Handle French date formats from Espace St-Denis
            const cleanDate = dateString.replace(/[^\w\s\-\/:.]/g, '').trim();
            
            // Handle formats like "7 au 9 octobre 2025"
            if (cleanDate.includes('octobre') || cleanDate.includes('november') || 
                cleanDate.includes('décembre') || cleanDate.includes('janvier')) {
                
                // Convert French months to English
                const frenchDate = cleanDate
                    .replace('octobre', 'October')
                    .replace('novembre', 'November') 
                    .replace('décembre', 'December')
                    .replace('janvier', 'January')
                    .replace('février', 'February')
                    .replace('mars', 'March')
                    .replace('avril', 'April')
                    .replace('mai', 'May')
                    .replace('juin', 'June')
                    .replace('juillet', 'July')
                    .replace('août', 'August')
                    .replace('septembre', 'September')
                    .replace(' au ', ' - '); // Handle date ranges
                
                // Extract the first date from ranges
                const parts = frenchDate.split('-')[0].trim();
                const parsedDate = new Date(parts);
                
                if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
                    return parsedDate;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    determineCategory(category, title) {
        const lowerCategory = (category || '').toLowerCase();
        const lowerTitle = title.toLowerCase();
        
        if (lowerCategory.includes('humour') || lowerTitle.includes('comedy')) {
            return 'Comedy';
        } else if (lowerCategory.includes('music') || lowerCategory.includes('musique')) {
            return 'Concert';
        } else if (lowerCategory.includes('variété')) {
            return 'Variety Show';
        } else if (lowerTitle.includes('symphony') || lowerTitle.includes('orchestra')) {
            return 'Classical Music';
        }
        return 'Theatre';
    }

    extractVenueInfo() {
        return {
            name: 'Théâtre St-Denis',
            address: '1594 Rue Saint-Denis, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.5156,
            longitude: -73.5631
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
module.exports = async function scrapeTheatreStDenisEvents() {
    const scraper = new TheatreStDenisEvents();
    return await scraper.scrapeEvents();
};
