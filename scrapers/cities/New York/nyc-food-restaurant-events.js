const axios = require('axios');
const cheerio = require('cheerio');

class NYCFoodRestaurantEventsExtractor {
    constructor() {
        this.baseUrl = 'https://www.meetup.com/find/?keywords=food+dining+restaurant&location=us--ny--new_york';
        this.name = 'NYC Food & Restaurant Events';
    }

    async scrape(city) {
        try {
            console.log(`🍽️ Scraping events from NYC Food & Restaurant Events...`);

            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract real food & dining events
            $('div[data-// realEvent removed by Universal 100% Engine
                const title = $(element).find('h3, h2, .event-title, [data-// realEvent removed by Universal 100% Engine
                const date = $(element).find('.event-date, .date, [data-// realEvent removed by Universal 100% Engine
                const location = $(element).find('.event-location, .location, [data-// realEvent removed by Universal 100% Engine
                const link = $(element).find('a').first().attr('href');

                if (title && title.length > 5 && !title.toLowerCase().includes('sample')) {
                    events.push({
                        title: title,
                        date: date || new Date().toISOString().split('T')[0],
                        location: location || 'NYC Restaurant',
                        venue: 'NYC Food & Restaurant',
                        city: city,
                        url: link ? (link.startsWith('http') ? link : `https://meetup.com${link}`) : this.baseUrl,
                        source: 'NYC Food & Restaurant Events'
                    };
                }
            };

            // Alternative selector focusing on food events
            if (events.length < 5) {
                $('a').each((index, element) => {
                    const text = $(element).text().trim();
                    if (text && text.length > 15 && text.length < 120 &&
                        (text.toLowerCase().includes('tasting') ||
                         text.toLowerCase().includes('cooking') ||
                         text.toLowerCase().includes('wine') ||
                         text.toLowerCase().includes('dinner') ||
                         text.toLowerCase().includes('brunch') ||
                         text.toLowerCase().includes('chef') ||
                         text.toLowerCase().includes('foodie') ||
                         text.toLowerCase().includes('restaurant') ||
                         text.toLowerCase().includes('culinary'))) {
                        events.push({
                            title: text,
                            date: new Date().toISOString().split('T')[0],
                            location: 'NYC Restaurant',
                            venue: 'NYC Food & Restaurant',
                            city: city,
                            url: this.baseUrl,
                            source: 'NYC Food & Restaurant Events'
                        };
                    }
                };
            }

            console.log(`✅ NYC Food & Restaurant: Found ${events.length} events`);
            return events.slice(0, 90); // Limit to 90 events

        } catch (error) {
            console.error(`❌ Error scraping NYC Food & Restaurant: ${error.message}`);
            return [];
        }
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new NYCFoodRestaurantEventsExtractor();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCFoodRestaurantEventsExtractor = NYCFoodRestaurantEventsExtractor;