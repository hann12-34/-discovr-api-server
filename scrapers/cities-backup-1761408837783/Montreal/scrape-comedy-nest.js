const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Comedy Nest Montreal Event Scraper
 * Montreal's legendary comedy club - over 30 years in business
 * Website: https://comedynest.com
 */
class ComedyNestEvents {
    constructor() {
        this.name = 'The Comedy Nest';
        this.eventsUrl = 'https://comedynest.com/shows/';
        this.source = 'comedy-nest';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`😂 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for Comedy Nest show listings
            $('article, .show, .event, .comedy-show, .listing, h2, h3, h4, .title, .show-title, .event-title').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .name, .show-title, .event-title').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 200) return;
                    
                    // Filter out common non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe') ||
                        lowercaseTitle.includes('home') ||
                        lowercaseTitle.includes('upcoming shows') ||
                        lowercaseTitle.includes('get on open mic') ||
                        lowercaseTitle.includes('fundraisers') ||
                        lowercaseTitle.includes('comedy nest') ||
                        lowercaseTitle.includes('over 30 years') ||
                        lowercaseTitle.includes('hilarious headliners') ||
                        lowercaseTitle.includes('downtown across') ||
                        lowercaseTitle.includes('indoor parking') ||
                        lowercaseTitle.includes('air conditioned') ||
                        lowercaseTitle.includes('wheelchair') ||
                        lowercaseTitle.includes('full service') ||
                        lowercaseTitle.includes('copyright') ||
                        lowercaseTitle.includes('design') ||
                        lowercaseTitle.includes('jd solutions') ||
                        lowercaseTitle.includes('514') ||
                        lowercaseTitle.includes('info@') ||
                        lowercaseTitle.includes('tickets') ||
                        lowercaseTitle.includes('show times') ||
                        lowercaseTitle.includes('©') ||
                        title.length < 10) return;

                    // Look for date information in the title
                    const dateMatch = title.match(/(\w+\s+\d{1,2}(?:,\s*\d{1,2}(?:,\s*\d{1,2})?)?,\s*\d{4})/);
                    let dateText = '';
                    if (dateMatch) {
                        dateText = dateMatch[1];
                    }

                    // Look for additional date info in the element
                    if (!dateText) {
                        dateText = $element.find('.date, .show-date, .event-date, time, .when').first().text().trim() ||
                                   $element.closest('article, .show, .event').find('.date, .show-date, .event-date, time, .when').first().text().trim();
                    }

                    // Look for description
                    const description = $element.find('.description, .show-description, .excerpt, p').first().text().trim();

                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at The Comedy Nest`,
                        date: this.parseDate(dateText, title) || new Date(),
                        venue: { name: this.extractVenueInfo().name, city: 'Montreal' },
                        city: this.city,
                        province: this.province,
                        price: 'Check website for pricing',
                        category: 'Comedy',
                        source: this.source,
                        url: this.eventsUrl,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateString, title) {
        if (!dateString && title) {
            // Try to extract date from title
            const dateMatch = title.match(/(\w+\s+\d{1,2}(?:,\s*\d{1,2}(?:,\s*\d{1,2})?)?,\s*\d{4})/);
            if (dateMatch) {
                dateString = dateMatch[1];
            }
        }

        if (!dateString) return null;

        try {
            // Handle Comedy Nest specific date formats
            const cleanDate = dateString.replace(/[^\w\s\-\/:.,-]/g, '').trim();
            
            // Try to parse the date
            const parsedDate = new Date(cleanDate);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
                return parsedDate;
            }

            // Try alternative parsing for specific formats
            if (cleanDate.includes('2025')) {
                const altDate = new Date(cleanDate);
                if (!isNaN(altDate.getTime())) {
                    return altDate;
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    extractVenueInfo() {
        return {
            name: 'The Comedy Nest',
            address: '2313 Rue Sainte-Catherine O, Montreal, QC',
            city: this.city,
            province: this.province,
            latitude: 45.4903,
            longitude: -73.5833
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
module.exports = async function scrapeComedyNestEvents() {
    const scraper = new ComedyNestEvents();
    return await scraper.scrapeEvents();
};
