const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class JustForLaughsEvents {
    constructor() {
        this.name = 'Just For Laughs Festival';
        this.eventsUrl = 'https://www.hahaha.com/en/shows';
        this.source = 'just-for-laughs';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for show links and events with expanded selectors
            $('a[href*="/spectacle/"], a[href*="/show/"], .event, .show, .comedy-show, article, .card, .festival-event, .performance, .comedian-event, .festival-show, .calendar-event, .upcoming-event, [data-event], .wp-block-group, .entry, .show-listing, .performer, h1, h2, h3, h4, .wp-block-heading, .artist, .comedian').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .name').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 150) return;
                    
                    // Filter out non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe')) return;

                    const href = $(element).attr('href');
                    const eventUrl = href ? (href.startsWith('http') ? href : `${this.eventsUrl}${href}`) : null;

                    // Extract events - create with current date if no specific date found
                    const dateText = $(element).closest('.event-container, .show-container').find('.date, .event-date, time').text().trim();
                    const eventDate = this.parseDate(dateText) || new Date();
                    
                    if (this.isEventLive(eventDate)) {
                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: `Comedy show at Just For Laughs Montreal - ${title}`,
                            date: eventDate,
                            venue: {
                                name: 'Just For Laughs Venue',
                                address: 'Quartier des spectacles, Montreal, QC',
                                city: this.city,
                                province: this.province,
                                latitude: 45.5088,
                                longitude: -73.5878
                            },
                            city: this.city,
                            province: this.province,
                            category: 'Comedy',
                            source: this.source,
                            url: eventUrl,
                            scrapedAt: new Date()
                        };
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`Error extracting event ${index + 1}:`, error.message);
                }
            });

            // No hardcoded festival events - only extract real events from page

            return filterEvents(events);
        } catch (error) {
            console.error(`Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            const frenchMonths = {
                'janvier': 'January', 'février': 'February', 'mars': 'March',
                'avril': 'April', 'mai': 'May', 'juin': 'June',
                'juillet': 'July', 'août': 'August', 'septembre': 'September',
                'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
            };

            let englishDateStr = cleanDateStr;
            for (const [french, english] of Object.entries(frenchMonths)) {
                englishDateStr = englishDateStr.replace(new RegExp(french, 'gi'), english);
            }

            const parsedDate = new Date(englishDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new JustForLaughsEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;



