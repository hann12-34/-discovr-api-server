#!/usr/bin/env node

// Rogers Arena Vancouver - REAL SCRAPER
const axios = require('axios');
const cheerio = require('cheerio');

class RogersArenaScraper {
    constructor() {
        this.venueName = 'Rogers Arena';
        this.venueUrl = 'https://rogersarena.com';
        this.eventsUrl = 'https://rogersarena.com/events/';
        this.city = 'Vancouver';
        this.venue = {
            name: this.venueName,
            address: '800 Griffiths Way, Vancouver, BC V6B 6G1',
            city: this.city,
            province: 'BC',
            coordinates: { lat: 49.2777, lon: -123.1090 }
        };
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Try various date formats that Rogers Arena might use
            const cleanDate = dateString.trim().replace(/\s+/g, ' ');
            
            // Handle formats like "Dec 15, 2024" or "December 15, 2024"
            if (/[A-Za-z]{3,} \d{1,2},? \d{4}/.test(cleanDate)) {
                return new Date(cleanDate);
            }
            
            // Handle formats like "2024-12-15"
            if (/\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
                return new Date(cleanDate);
            }
            
            // Handle formats like "15/12/2024"
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

    async scrape() {
        console.log(`🏒 Scraping real events from ${this.venueName}...`);
        
        try {
            const response = await axios.get(this.eventsUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Try multiple selectors to find events
            const eventSelectors = [
                '.event-item',
                '.event',
                '.events-item',
                '.calendar-event',
                '.upcoming-event',
                '[class*="event"]'
            ];

            let foundEvents = false;
            for (const selector of eventSelectors) {
                const eventElements = $(selector);
                if (eventElements.length > 0) {
                    console.log(`Found ${eventElements.length} events using selector: ${selector}`);
                    foundEvents = true;
                    
                    eventElements.each((index, element) => {
                        const $event = $(element);
                        
                        const title = $event.find('.title, .event-title, h2, h3, .name, [class*="title"]').first().text().trim() ||
                                     $event.find('a').first().text().trim() ||
                                     $event.text().trim().split('\n')[0];
                        
                        if (!title || title.length < 3) return;
                        
                        const dateText = $event.find('.date, .event-date, .when, [class*="date"]').first().text().trim() ||
                                        $event.find('time').attr('datetime') ||
                                        $event.find('time').text().trim();
                        
                        const description = $event.find('.description, .event-description, .summary, p').first().text().trim() ||
                                          $event.attr('title') || '';
                        
                        const link = $event.find('a').first().attr('href') || '';
                        const fullUrl = link.startsWith('http') ? link : `${this.venueUrl}${link.startsWith('/') ? '' : '/'}${link}`;
                        
                        const startDate = this.parseDate(dateText);
                        if (!startDate || startDate < new Date()) return;
                        
                        // Determine category based on title
                        let category = 'Event';
                        const titleLower = title.toLowerCase();
                        if (titleLower.includes('canucks') || titleLower.includes('hockey') || titleLower.includes('nhl')) {
                            category = 'Hockey';
                        } else if (titleLower.includes('concert') || titleLower.includes('tour') || titleLower.includes('music')) {
                            category = 'Concert';
                        } else if (titleLower.includes('wwe') || titleLower.includes('wrestling')) {
                            category = 'Wrestling';
                        } else if (titleLower.includes('disney') || titleLower.includes('family')) {
                            category = 'Family';
                        } else if (titleLower.includes('cirque') || titleLower.includes('circus')) {
                            category = 'Circus';
                        }
                        
                        events.push({
                            id: `rogers-arena-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`,
                            title: title,
                            description: description || `${title} at Rogers Arena`,
                            startDate: startDate,
                            venue: this.venue,
                            city: this.city,
                            category: category,
                            url: fullUrl || this.venueUrl,
                            isFeatured: index < 3
                        });
                    });
                    break;
                }
            }

            if (!foundEvents) {
                console.log('❌ No events found with standard selectors, trying fallback approach...');
                // Try to find any links or text that might be events
                const allText = $('body').text();
                if (allText.includes('Canucks') || allText.includes('Events') || allText.includes('Calendar')) {
                    console.log('Site contains event-related content but structure may have changed');
                }
            }

            console.log(`✅ Found ${events.length} real events from ${this.venueName}`);
            return events;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }
}

module.exports = RogersArenaScraper;
