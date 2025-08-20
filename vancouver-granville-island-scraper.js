#!/usr/bin/env node

// Granville Island Vancouver - REAL SCRAPER
const axios = require('axios');
const cheerio = require('cheerio');

class GranvilleIslandScraper {
    constructor() {
        this.venueName = 'Granville Island';
        this.venueUrl = 'https://granvilleisland.com';
        this.eventsUrl = 'https://granvilleisland.com/events';
        this.artsClubUrl = 'https://artsclub.com';
        this.city = 'Vancouver';
        this.venue = {
            name: this.venueName,
            address: '1661 Duranleau St, Vancouver, BC V6H 3S3',
            city: this.city,
            province: 'BC',
            coordinates: { lat: 49.2713, lon: -123.1347 }
        };
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const cleanDate = dateString.trim().replace(/\s+/g, ' ');
            
            // Handle common Granville Island date formats
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
                '.activity-item',
                '.listing-item',
                '.show-listing'
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
                        
                        // Determine category based on title and content
                        let category = 'Event';
                        const titleLower = title.toLowerCase();
                        
                        if (titleLower.includes('market') || titleLower.includes('vendor')) {
                            category = 'Market';
                        } else if (titleLower.includes('theatre') || titleLower.includes('play') || titleLower.includes('musical')) {
                            category = 'Theatre';
                        } else if (titleLower.includes('tour') || titleLower.includes('guided')) {
                            category = 'Tour';
                        } else if (titleLower.includes('kids') || titleLower.includes('family') || titleLower.includes('children')) {
                            category = 'Family';
                        } else if (titleLower.includes('festival') || titleLower.includes('celebration')) {
                            category = 'Festival';
                        } else if (titleLower.includes('comedy') || titleLower.includes('stand-up')) {
                            category = 'Comedy';
                        } else if (titleLower.includes('art') || titleLower.includes('craft') || titleLower.includes('artisan')) {
                            category = 'Arts & Crafts';
                        } else if (titleLower.includes('show') && titleLower.includes('boat')) {
                            category = 'Trade Show';
                        }
                        
                        events.push({
                            id: `granville-island-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`,
                            title: title,
                            description: description || `${title} at Granville Island`,
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
        console.log(`🏝️ Scraping real events from ${this.venueName}...`);
        
        try {
            const allEvents = [];
            
            // Scrape main events page
            const mainEvents = await this.scrapeEventsPage(this.eventsUrl, 'events');
            allEvents.push(...mainEvents);
            
            // Try to scrape Arts Club Theatre events (they have venues on Granville Island)
            try {
                const artsClubEvents = await this.scrapeEventsPage(`${this.artsClubUrl}/events`, 'theatre');
                // Filter for Granville Island venues only
                const islandTheatreEvents = artsClubEvents.filter(event => 
                    event.description.toLowerCase().includes('granville') || 
                    event.title.toLowerCase().includes('granville')
                );
                allEvents.push(...islandTheatreEvents);
            } catch (artsClubError) {
                console.log('Arts Club Theatre events not available');
            }

            console.log(`✅ Found ${allEvents.length} real events from ${this.venueName}`);
            return allEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }
}

module.exports = GranvilleIslandScraper;
