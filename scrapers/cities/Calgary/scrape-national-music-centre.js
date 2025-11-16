const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'National Music Centre (Studio Bell)',
    url: 'https://www.nmc.ca/whats-on/',
    city: 'Calgary',
    eventSelectors: [
        '.event-card',
        '.program-card',
        'article.event',
        '.view-events .views-row',
        '[class*="event"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.program-title',
        'a[href*="/event"]'
    ],
    dateSelectors: [
        '.event-date',
        '.date',
        'time',
        '.show-date',
        '[class*="date"]'
    ],
    imagePriority: 'high'
});
