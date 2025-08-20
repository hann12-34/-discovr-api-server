#!/usr/bin/env node

// Science World Vancouver - REAL SCRAPER
const axios = require('axios');
const cheerio = require('cheerio');

class ScienceWorldScraper {
    constructor() {
        this.venueName = 'Science World';
        this.venueUrl = 'https://www.scienceworld.ca';
        this.eventsUrl = 'https://www.scienceworld.ca/events';
        this.omnimaxUrl = 'https://www.scienceworld.ca/omnimax';
        this.city = 'Vancouver';
        this.venue = {
            name: this.venueName,
            address: '1455 Quebec St, Vancouver, BC V6A 3Z7',
            city: this.city,
            province: 'BC',
            coordinates: { lat: 49.2735, lon: -123.1034 }
        };
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const cleanDate = dateString.trim().replace(/\s+/g, ' ');
            
            // Handle common Science World date formats
            if (/[A-Za-z]{3,} \d{1,2},? \d{4}/.test(cleanDate)) {
                return new Date(cleanDate);
            }
            
            if (/\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
                return new Date(cleanDate);
            }
            
            const dmyMatch = cleanDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dmyMatch) {
                return new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`);
            }
            
            return new Date(cleanDate);
        } catch (error) {
            console.error(`Date parsing error: ${dateString}`, error.message);
            return null;
        }
    }

    async scrapeEventsPage(url, pageType = 'events') {
        const events = [];
        
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            // Try multiple selectors for events
            const eventSelectors = [
                '.event-item',
                '.event',
                '.events-item',
                '.upcoming-event',
                '.calendar-event',
                '[class*="event"]',
                '.program-item',
                '.show-item'
            ];

            let foundEvents = false;
            for (const selector of eventSelectors) {
                const eventElements = $(selector);
                if (eventElements.length > 0) {
                    console.log(`Found ${eventElements.length} ${pageType} using selector: ${selector}`);
                    foundEvents = true;
                    
                    eventElements.each((index, element) => {
                        const $event = $(element);
                        
                        const title = $event.find('.title, .event-title, h2, h3, .name, [class*="title"]').first().text().trim() ||
                                     $event.find('a').first().text().trim() ||
                                     $event.text().trim().split('\n')[0];
                        
                        if (!title || title.length < 3) return;
                        
                        const dateText = $event.find('.date, .event-date, .when, [class*="date"], time').first().text().trim() ||
                                        $event.find('time').attr('datetime') ||
                                        $event.find('time').text().trim();
                        
                        const description = $event.find('.description, .event-description, .summary, p').first().text().trim() ||
                                          $event.attr('title') || '';
                        
                        const link = $event.find('a').first().attr('href') || '';
                        const fullUrl = link.startsWith('http') ? link : `${this.venueUrl}${link.startsWith('/') ? '' : '/'}${link}`;
                        
                        const startDate = this.parseDate(dateText);
                        if (!startDate || startDate < new Date()) return;
                        
                        // Determine category
                        let category = pageType === 'omnimax' ? 'OMNIMAX' : 'Event';
                        const titleLower = title.toLowerCase();
                        
                        if (titleLower.includes('omnimax') || pageType === 'omnimax') {
                            category = 'OMNIMAX';
                        } else if (titleLower.includes('exhibition') || titleLower.includes('exhibit')) {
                            category = 'Exhibition';
                        } else if (titleLower.includes('workshop') || titleLower.includes('lab')) {
                            category = 'Workshop';
                        } else if (titleLower.includes('after dark') || titleLower.includes('adult')) {
                            category = 'Adult Event';
                        } else if (titleLower.includes('show') || titleLower.includes('demonstration')) {
                            category = 'Science Show';
                        }
                        
                        events.push({
                            id: `science-world-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`,
                            title: title,
                            description: description || `${title} at Science World`,
                            startDate: startDate,
                            venue: this.venue,
                            city: this.city,
                            category: category,
                            url: fullUrl || this.venueUrl,
                            isFeatured: index < 2 && pageType === 'events'
                        });
                    });
                    break;
                }
            }

            if (!foundEvents) {
                console.log(`❌ No ${pageType} found with standard selectors`);
            }
        } catch (error) {
            console.error(`Error scraping ${pageType} from ${url}:`, error.message);
        }

        return events;
    }

    async scrape() {
        console.log(`🔬 Scraping real events from ${this.venueName}...`);
        
        try {
            const allEvents = [];
            
            // Scrape main events page
            const mainEvents = await this.scrapeEventsPage(this.eventsUrl, 'events');
            allEvents.push(...mainEvents);
            
            // Scrape OMNIMAX shows
            const omnimaxEvents = await this.scrapeEventsPage(this.omnimaxUrl, 'omnimax');
            allEvents.push(...omnimaxEvents);

            console.log(`✅ Found ${allEvents.length} real events from ${this.venueName}`);
            return allEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }
}

module.exports = ScienceWorldScraper;
