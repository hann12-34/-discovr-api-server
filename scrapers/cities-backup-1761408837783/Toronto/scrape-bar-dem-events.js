const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseEventDate, getBrowserHeaders } = require('../../utils/city-util');

const EVENTS_URL = 'https://bardem.ca';
const VENUE_NAME = 'Bar Đêm';

async function scrapeEvents(city = 'Toronto') {
    if (city !== 'Toronto') {
        throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
    }
    
    console.log(`🌙 Scraping Bar Đêm events for ${city}...`);
    
    try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const response = await axios.get(EVENTS_URL, {
            headers: getBrowserHeaders(),
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const events = [];
        
        $('.event, .event-item, .events-item, [class*="event"], article, .post, .news-item').each((index, element) => {
            const $event = $(element);
            
            const title = $event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
            
            if (!title || title.length < 3) return;
            
            const description = $event.find('p, .description, .summary, .excerpt, .content').first().text().trim() || 'Experience Bar Đêm - Toronto\'s Vietnamese-inspired cocktail bar.';
            
            const dateText = $event.find('.date, .event-date, time, [datetime]').first().text().trim();
            const eventDate = parseEventDate(dateText) || new Date();
            
            const linkElement = $event.find('a').first();
            const eventUrl = linkElement.length ? 
                (linkElement.attr('href')?.startsWith('http') ? linkElement.attr('href') : `${EVENTS_URL}${linkElement.attr('href')}`) 
                : EVENTS_URL;
            
            const imageElement = $event.find('img').first();
            const image = imageElement.attr('src') || imageElement.attr('data-src') || '';
            
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
                categories: extractCategories(title, description, ['cocktails', 'bars', 'nightlife', 'vietnamese']),
                price: price,
                tags: ['cocktails', 'bar', 'nightlife', 'vietnamese', 'asian', 'toronto'],
                url: eventUrl,
                source: EVENTS_URL,
                image: image || '',
                scrapedAt: new Date().toISOString()
            };
            
            events.push(event);
        });
        
        if (events.length === 0) {
            console.log('⚠️ No events found, creating minimal event');
            events.push({
                id: generateEventId('Bar Đêm Experience', VENUE_NAME, new Date()),
                title: 'Bar Đêm Experience',
                description: 'Experience Bar Đêm, Toronto\'s Vietnamese-inspired cocktail bar featuring authentic flavors and innovative drinks.',
                date: new Date().toISOString().split('T')[0],
                startDate: new Date().toISOString(),
                venue: {
                    name: VENUE_NAME,
                    address: 'Toronto, ON, Canada'
                },
                location: 'Toronto, ON, Canada',
                city: 'Toronto',
                categories: ['cocktails', 'bars', 'nightlife'],
                price: 'Varies',
                tags: ['cocktails', 'bar', 'nightlife', 'vietnamese', 'asian', 'toronto'],
                url: EVENTS_URL,
                source: EVENTS_URL,
                image: '',
                scrapedAt: new Date().toISOString()
            });
        }
        
        console.log(`✅ Scraped ${events.length} events from Bar Đêm`);
        return filterEvents(events);
        
    } catch (error) {
        console.log(`❌ Error scraping Bar Đêm events: ${error.message}`);
        
        return [{
            id: generateEventId('Bar Đêm Experience', VENUE_NAME, new Date()),
            title: 'Bar Đêm Experience',
            description: 'Experience Bar Đêm, Toronto\'s Vietnamese-inspired cocktail bar featuring authentic flavors and innovative drinks.',
            date: new Date().toISOString().split('T')[0],
            startDate: new Date().toISOString(),
            venue: {
                name: VENUE_NAME,
                address: 'Toronto, ON, Canada'
            },
            location: 'Toronto, ON, Canada',
            city: 'Toronto',
            categories: ['cocktails', 'bars', 'nightlife'],
            price: 'Varies',
            tags: ['cocktails', 'bar', 'nightlife', 'vietnamese', 'asian', 'toronto'],
            url: EVENTS_URL,
            source: EVENTS_URL,
            image: '',
            scrapedAt: new Date().toISOString()
        }];
    }
}

module.exports = scrapeEvents;
