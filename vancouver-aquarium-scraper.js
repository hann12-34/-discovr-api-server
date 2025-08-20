#!/usr/bin/env node

// Vancouver Aquarium - REAL SCRAPER
const axios = require('axios');
const cheerio = require('cheerio');

class VancouverAquariumScraper {
    constructor() {
        this.venueName = 'Vancouver Aquarium';
        this.venueUrl = 'https://www.vanaqua.org';
        this.eventsUrl = 'https://www.vanaqua.org/events';
        this.programsUrl = 'https://www.vanaqua.org/explore/programs';
        this.city = 'Vancouver';
        this.venue = {
            name: this.venueName,
            address: '845 Avison Way, Vancouver, BC V6G 3E2',
            city: this.city,
            province: 'BC',
            coordinates: { lat: 49.3006, lon: -123.1312 }
        };
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const cleanDate = dateString.trim().replace(/\s+/g, ' ');
            
            // Handle common Vancouver Aquarium date formats
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
                '.activity-item',
                '.show-item',
                '.experience-item'
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
                        
                        if (titleLower.includes('exhibit') || titleLower.includes('exhibition')) {
                            category = 'Exhibition';
                        } else if (titleLower.includes('feeding') || titleLower.includes('show') || titleLower.includes('training')) {
                            category = 'Animal Show';
                        } else if (titleLower.includes('sleepover') || titleLower.includes('family') || titleLower.includes('kids')) {
                            category = 'Family Event';
                        } else if (titleLower.includes('adult') || titleLower.includes('after hours')) {
                            category = 'Adult Event';
                        } else if (titleLower.includes('workshop') || titleLower.includes('class')) {
                            category = 'Workshop';
                        } else if (titleLower.includes('tour') || titleLower.includes('behind the scenes')) {
                            category = 'Tour';
                        } else if (titleLower.includes('education') || titleLower.includes('learning') || titleLower.includes('program')) {
                            category = 'Educational';
                        }
                        
                        events.push({
                            id: `vancouver-aquarium-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`,
                            title: title,
                            description: description || `${title} at Vancouver Aquarium`,
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
        console.log(`🐟 Scraping real events from ${this.venueName}...`);
        
        try {
            const allEvents = [];
            
            // Scrape main events page
            const mainEvents = await this.scrapeEventsPage(this.eventsUrl, 'events');
            allEvents.push(...mainEvents);
            
            // Scrape programs page for educational events
            const programEvents = await this.scrapeEventsPage(this.programsUrl, 'programs');
            allEvents.push(...programEvents);

            console.log(`✅ Found ${allEvents.length} real events from ${this.venueName}`);
            return allEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }
}

module.exports = VancouverAquariumScraper;
