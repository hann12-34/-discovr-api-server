const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseEventDate } = require('../../utils/city-util');

const EVENTS_URL = 'https://barmordecai.com';
const VENUE_NAME = 'Bar Mordecai';

async function scrapeEvents(city = 'Toronto') {
    if (city !== 'Toronto') {
        throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
    }
    
    console.log(`🍻 Scraping Bar Mordecai events for ${city}...`);
    
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
        
        $('.event, .event-item, .events-item, [class*="event"], article, .post, .party, .night').each((index, element) => {
            const $event = $(element);
            
            const title = $event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
            
            if (!title || title.length < 3) return;
            
            const description = $event.find('p, .description, .summary, .excerpt, .content').first().text().trim() || 'Experience Bar Mordecai, Toronto\'s distinctive cocktail bar with creative drinks and atmosphere.';
            
            const dateText = $event.find('.date, .event-date, time, [datetime], .when').first().text().trim();
            const eventDate = parseEventDate(dateText);
            
            // CRITICAL: Skip events without real dates!
            if (!eventDate || isNaN(eventDate.getTime())) {
                console.log(`   ❌ No valid date for "${title}", skipping`);
                return;
            }
            
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
                    address: 'Toronto, ON'  // TODO: Add specific street address
                },
                location: 'Toronto, ON, Canada',
                city: 'Toronto',
                categories: extractCategories(title, description, ['cocktails', 'bars', 'nightlife']),
                price: price,
                tags: ['cocktails', 'bars', 'nightlife', 'creative', 'toronto'],
                url: eventUrl,
                source: EVENTS_URL,
                image: image || '',
                scrapedAt: new Date().toISOString()
            };
            
            events.push(event);
        });
        
        // REMOVED: Don't create fake events with current timestamp
        if (events.length === 0) {
            console.log('⚠️ No events with valid dates found - returning empty array');
        }
        
        console.log(`✅ Scraped ${events.length} events from Bar Mordecai`);
        return filterEvents(events);
        
    } catch (error) {
        console.log(`❌ Error scraping Bar Mordecai events: ${error.message}`);
        return []; // Don't create fake events on error
    }
}

module.exports = scrapeEvents;
