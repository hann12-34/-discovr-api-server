const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const DataQualityFilter = require('../../../enhanced-data-quality-filter');
const slugify = require('slugify');

async function scrapeTheatreCalgaryEvents() {
        console.log('🎭 Scraping events from Theatre Calgary...');
        
        // DISABLED: Theatre Calgary scraper is broken
        // Issues: Extracts "Details" as titles, concatenates all dates into one giant string
        // Needs proper implementation with correct selectors
        console.log('⚠️  Theatre Calgary scraper disabled - needs fixing');
        return [];
        
        /* BROKEN CODE - DISABLED
        const filter = new DataQualityFilter();
        try {
            
            const response = await axios.get('https://www.theatrecalgary.com/shows');
            const $ = cheerio.load(response.data);
            const events = [];

            // Look for show containers with dates
            $('.show, .event, article, [class*="show"]').each((index, element) => {
                const $element = $(element);
                
                // Extract title from link or heading
                let title = $element.find('h1, h2, h3, h4, a[href*="/shows/"]').first().text().trim();
                if (!title) {
                    const link = $element.find('a[href*="/shows/"]').attr('href');
                    title = link ? link.replace('/shows/2025-2026-', '').replace(/[-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
                }
                
                // Extract date information
                let dateText = $element.find('.date, time, [class*="date"], .when').text().trim();
                if (!dateText) {
                    // Look for date patterns in surrounding text
                    const allText = $element.text();
                    const dateMatch = allText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?/i);
                    dateText = dateMatch ? dateMatch[0] : null;
                }
                
                // Extract description
                const description = $element.find('p, .description, .summary').first().text().trim() || 
                                  $element.text().trim().substring(0, 200);

                const link = $element.find('a[href*="/shows/"]').attr('href');

                if (title && title.length > 3 && !title.toLowerCase().includes('shows')) {
                    events.push({
                        id: uuidv4(),
                        title,
                        date: dateText,
                        time: null,
                        url: link ? (link.startsWith('http') ? link : 'https://www.theatrecalgary.com' + link) : 'https://www.theatrecalgary.com/shows',
                        venue: { name: 'Theatre Calgary', address: '220 9 Avenue SE, Calgary, AB T2G 5C4', city: 'Calgary' },
                        location: 'Calgary, AB',
                        category: 'Theatre',
                        city: 'Calgary',
                        source: 'theatre-calgary',
                        description: description && description.length > 20 ? description : `${title} at Theatre Calgary`,
                        image: null
                    });
                }
            });

            console.log(`Found ${events.length} total events from Theatre Calgary`);
    
    // Apply data quality filtering
    const cleanedEvents = filter.filterEvents(events);
    return cleanedEvents;
        } catch (error) {
            console.error('Error scraping Theatre Calgary events:', error.message);
            return [];
        }
}

module.exports = scrapeTheatreCalgaryEvents;
