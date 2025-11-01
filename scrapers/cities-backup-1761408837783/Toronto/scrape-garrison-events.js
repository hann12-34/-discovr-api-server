const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice } = require('../../utils/city-util');

const EVENTS_URL = 'https://thegarrison.ca';
const VENUE_NAME = 'The Garrison';

async function scrapeEvents(city = 'Toronto') {
    if (city !== 'Toronto') {
        throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
    }
    
    console.log(`🎵 Scraping The Garrison events for ${city}...`);
    
    try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const response = await axios.get(EVENTS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const events = [];
        
        $('.event, .event-item, .events-item, [class*="event"], article, .post, .show, .concert').each((index, element) => {
            const $event = $(element);
            
            const title = $event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
            
            if (!title || title.length < 3) return;
            
            const description = $event.find('p, .description, .summary, .excerpt, .content').first().text().trim() || 'Live music and entertainment at The Garrison, Toronto\'s iconic music venue and bar.';
            
            const dateText = $event.find('.date, .event-date, time, [datetime], .when').first().text().trim();
            const eventDate = new Date();
            
            const linkElement = $event.find('a').first();
            const eventUrl = linkElement.length ? 
                (linkElement.attr('href')?.startsWith('http') ? linkElement.attr('href') : `${EVENTS_URL}${linkElement.attr('href')}`) 
                : EVENTS_URL;
            
            const imageElement = $event.find('img').first();
            const image = imageElement.attr('src') || imageElement.attr('data-src') || '';
            
            const priceText = $event.find('.price, .cost, [class*="price"], .admission').text();
            const price = extractPrice(priceText) || 'Varies';
            
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
                categories: extractCategories(title, description, ['music', 'live music', 'bars', 'concerts']),
                price: price,
                tags: ['music', 'live music', 'bars', 'concerts', 'nightlife', 'toronto'],
                url: eventUrl,
                source: EVENTS_URL,
                image: image || '',
                scrapedAt: new Date().toISOString()
            };
            
            events.push(event);
        });
        
        
        console.log(`✅ Scraped ${events.length} events from The Garrison`);
        return filterEvents(events);
        
    } catch (error) {
        console.log(`❌ Error scraping Garrison events: ${error.message}`);
        return [];
    }
}

module.exports = scrapeEvents;
