const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseEventDate, getBrowserHeaders } = require('../../utils/city-util');

const EVENTS_URL = 'https://lopantoronto.com';
const VENUE_NAME = 'LoPan';

async function scrapeEvents(city = 'Toronto') {
    // Strict city validation
    if (city !== 'Toronto') {
        throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
    }
    
    console.log(`🥢 Scraping LoPan events for ${city}...`);
    
    try {
        // Add delay to avoid being flagged as bot
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const response = await axios.get(EVENTS_URL, {
            headers: getBrowserHeaders(),
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const events = [];
        
        // Look for events in various common selectors
        $('.event, .event-item, .events-item, [class*="event"], article, .post, .news-item').each((index, element) => {
            const $event = $(element);
            
            const title = $event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
            
            if (!title || title.length < 3) return;
            
            const description = $event.find('p, .description, .summary, .excerpt, .content').first().text().trim() || 'Special event at LoPan - Toronto\'s premier Asian fusion dining experience.';
            
            // Extract date
            const dateText = $event.find('.date, .event-date, time, [datetime]').first().text().trim();
            const eventDate = parseEventDate(dateText) || new Date();
            
            // Extract link
            const linkElement = $event.find('a').first();
            const eventUrl = linkElement.length ? 
                (linkElement.attr('href')?.startsWith('http') ? linkElement.attr('href') : `${EVENTS_URL}${linkElement.attr('href')}`) 
                : EVENTS_URL;
            
            // Extract image
            const imageElement = $event.find('img').first();
            const image = imageElement.attr('src') || imageElement.attr('data-src') || '';
            
            // Extract price
            const priceText = $event.find('.price, .cost, [class*="price"]').text();
            const price = extractPrice(priceText);
            
            const event = {
                id: generateEventId(title, VENUE_NAME, eventDate),
                title: title,
                description: description && description.length > 20 ? description.substring(0, 300) : `${title} in Toronto`,
                date: eventDate.toISOString().split('T')[0],
                startDate: eventDate.toISOString(),
                venue: {
                    name: VENUE_NAME,
                    address: 'Toronto, ON, Canada'
                },
                location: 'Toronto, ON, Canada',
                city: 'Toronto',
                categories: extractCategories(title, description, ['dining', 'asian cuisine', 'nightlife', 'bars']),
                price: price,
                tags: ['dining', 'asian fusion', 'restaurant', 'bar', 'nightlife', 'toronto'],
                url: eventUrl,
                source: EVENTS_URL,
                image: image || '',
                scrapedAt: new Date().toISOString()
            };
            
            events.push(event);
        });
        
        
        console.log(`✅ Scraped ${events.length} events from LoPan`);
        return filterEvents(events);
        
    } catch (error) {
        console.log(`❌ Error scraping LoPan events: ${error.message}`);
        
        return [];
    }
}

module.exports = scrapeEvents;
