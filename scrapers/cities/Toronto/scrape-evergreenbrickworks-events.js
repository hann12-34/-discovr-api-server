const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const AbstractScraper = require('../../../shared/scrapers/AbstractScraper');

class EvergreenBrickWorksScraper extends AbstractScraper {
    constructor(city) {
        super();
        this.city = city;
        this.source = 'Evergreen Brick Works';
        this.baseUrl = 'https://www.evergreen.ca';
        this.url = 'https://www.evergreen.ca/whats-on/';
        this.venue = {
            name: 'Evergreen Brick Works',
            address: '550 Bayview Ave, Toronto, ON M4W 3X8',
            city: this.city,
            province: 'ON',
            country: 'Canada',
            postalCode: 'M4W 3X8',
            latitude: 43.6841,
            longitude: -79.3654
        };
    }

    _generateEventId(title, startDate) {
        const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
        const data = `${this.source}-${title}-${dateStr}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    _parseDate(dadaeventDateText) {
        if (!dadaeventDateText) return { startDate: new Date(), endDate: new Date() };

        const now = new Date();
        const year = now.getFullYear();
        let startDate, endDate;

        if (dadaeventDateText.toLowerCase().includes('ongoing')) {
            startDate = now;
            endDate = new Date(year, 11, 31);
        } else if (dadaeventDateText.includes('-')) {
            const parts = dadaeventDateText.split('-').map(part => part.trim());
            const startPart = parts[0].includes(',') ? parts[0] : `${parts[0]}, ${year}`;
            const endPart = parts[1].includes(',') ? parts[1] : `${parts[1]}, ${year}`;
            startDate = new Date(startPart);
            endDate = new Date(endPart);
        } else {
            const singleDatePart = dadaeventDateText.includes(',') ? dadaeventDateText : `${dadaeventDateText}, ${year}`;
            startDate = new Date(singleDatePart);
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 2);
        }

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            this.log(`Could not parse date: "${dada
            return null;
        }

        return { startDate, endDate };
    }

    _extractCategories(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        const categories = [this.city, 'Community', 'Nature'];

        const mappings = {
            'Market': [/market/i, /farmers/i, /farm/i],
            'Food & Drink': [/food/i, /drink/i, /beer/i, /wine/i, /culinary/i],
            'Education': [/workshop/i, /learn/i, /class/i, /talk/i, /tour/i],
            'Arts & Culture': [/art/i, /gallery/i, /exhibition/i, /culture/i],
            'Music': [/music/i, /concert/i, /band/i, /live music/i],
            'Film': [/film/i, /movie/i, /screening/i],
            'Family': [/family/i, /children/i, /kids/i],
            'Festival': [/festival/i, /celebration/i],
            'Gardening': [/garden/i, /plant/i, /gardening/i],
            'Sustainability': [/sustainable/i, /sustainability/i, /environment/i, /eco/i, /green/i],
            'Wellness': [/yoga/i, /meditation/i, /wellness/i, /health/i, /hike/i, /walk/i]
        };

        for (const [category, regexes] of Object.entries(mappings)) {
            if (regexes.some(regex => regex.test(text))) {
                categories.push(category);
            }
        }

        return [...new Set(categories)];
    }

    async scrape() {
        this.log(`Scraping events from ${this.source}`);
        try {
            const { data } = await axios.get(this.url);
            const $ = cheerio.load(data);
            let events = [];

            $('div.card-whats-on').each((i, el) => {
                const title = $(el).find('h3.card-title a').text().trim();
                if (!title) return;

                let eventUrl = $(el).find('h3.card-title a').attr('href') || '';
                let imageUrl = $(el).find('div.card-img-top-placeholder').attr('style') || '';
                const description = $(el).find('p.card-text').text().trim();
                const date = $(el).find('p.date').text().trim();

                if (imageUrl) {
                    const urlMatch = imageUrl.match(/url\(([^)]+)\)/);
                    if (urlMatch) {
                        imageUrl = urlMatch[1].replace(/['"]/g, '');
                    }
                }

                const { startDate, endDate } = this._parseDate(date);
                const categories = this._extractCategories(title, description);

                const event = {
                    id: this._generateEventId(title, startDate),
                    title,
                    description,
                    url: eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`,
                    imageUrl: imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`,
                    startDate,
                    endDate,
                    venue: this.venue,
                    categories,
                    source: this.source,
                    price: 'Varies',
                    scrapedAt: new Date()
                };

                events.push(event);
            };

            this.log(`Found ${events.length} events from ${this.source}.`);
            return events;
        } catch (error) {
            this.log(`Error scraping ${this.source}: ${error.message}`);
            return [];
        }
    }
}

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new EvergreenBrickWorksScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.EvergreenBrickWorksScraper = EvergreenBrickWorksScraper;