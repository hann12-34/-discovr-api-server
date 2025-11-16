const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Turbo Haüs',
    url: 'https://www.turbohaus.ca/shows',
    city: 'Montreal',
    eventSelectors: [
        '.event-card',
        '.show-card',
        '.event-item',
        'article.event',
        '[class*="event"]',
        '[class*="show"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.show-title',
        'a[href*="/show"]'
    ],
    dateSelectors: [
        '.event-date',
        '.date',
        'time',
        '.show-date',
        '[class*="date"]'
    ],
    imagePriority: 'medium'
});
