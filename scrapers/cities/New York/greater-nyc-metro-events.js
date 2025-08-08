const axios = require('axios');
const cheerio = require('cheerio');

class GreaterNYCMetroEventsExtractor {
    constructor() {
        this.baseUrl = 'https://www.meetup.com/find/?keywords=events&location=us--ny--new_york';
        this.name = 'Greater NYC Metro Events';
    }

    async scrape(city = 'New York') {
        try {
            console.log(`🌆 Scraping events from Greater NYC Metro Area...`);

            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract events from Greater NYC Metro Area
            $('div[data-realEventCard').each((index, element) => {
                const title = $(element).find('h3, h2, .event-title, [data-realEvent-title"]').first().text().trim();
                const date = $(element).find('.event-date, .date, [data-realEvent-date"]').first().text().trim();
                const location = $(element).find('.event-location, .location, [data-realEvent-location"]').first().text().trim();
                const link = $(element).find('a').first().attr('href');

                if (title && title.length > 3) {
                    events.push({
                        title: title,
                        date: date || new Date().toISOString().split('T')[0],
                        location: location || 'Greater NYC Metro Area',
                        venue: 'Greater NYC Metro Area',
                        city: city,
                        url: link ? (link.startsWith('http') ? link : `https://meetup.com${link}`) : this.baseUrl,
                        source: 'Greater NYC Metro Events'
                    };
                }
            };

            // Alternative selector for different page structures
            if (events.length === 0) {
                $('a').each((index, element) => {
                    const text = $(element).text().trim();
                    if (text && text.length > 10 && text.length < 100 &&
                        (text.toLowerCase().includes('event') ||
                         text.toLowerCase().includes('festival') ||
                         text.toLowerCase().includes('concert') ||
                         text.toLowerCase().includes('show') ||
                         text.toLowerCase().includes('nyc') ||
                         text.toLowerCase().includes('new york'))) {
                        events.push({
                            title: text,
                            date: new Date().toISOString().split('T')[0],
                            location: 'Greater NYC Metro Area',
                            venue: 'Greater NYC Metro Area',
                            city: city,
                            url: this.baseUrl,
                            source: 'Greater NYC Metro Events'
                        };
                    }
                };
            }

            console.log(`✅ Greater NYC Metro: Found ${events.length} events`);
            return events.slice(0, 50); // Limit to 50 events

        } catch (error) {
            console.error(`❌ Error scraping Greater NYC Metro: ${error.message}`);
            return [];
        }
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new GreaterNYCMetroEventsExtractor();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.GreaterNYCMetroEventsExtractor = GreaterNYCMetroEventsExtractor;