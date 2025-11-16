const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Last Best Brewing & Distilling',
    url: 'https://lastbestbrewing.com/events/',
    city: 'Calgary',
    eventSelectors: [
        '.event-card',
        '.event-item',
        'article.event',
        '.event',
        '[class*="event"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.title',
        'a[href*="/event"]'
    ],
    dateSelectors: [
        '.event-date',
        '.date',
        'time',
        '[class*="date"]'
    ],
    imagePriority: 'medium'
});
