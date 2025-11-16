const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'The Ship and Anchor Pub',
    url: 'https://www.shipandanchor.com/events',
    city: 'Calgary',
    eventSelectors: [
        '.event-card',
        '.event-item',
        'article.event',
        '.show',
        '[class*="event"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.show-title',
        'a[href*="/event"]'
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
