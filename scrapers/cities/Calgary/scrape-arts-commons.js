const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Arts Commons',
    url: 'https://www.artscommons.ca/whats-on',
    city: 'Calgary',
    eventSelectors: [
        '.event-card',
        '.program-item',
        'article.event',
        '.view-content .views-row',
        '[class*="event"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.program-title',
        'a[href*="/show"]'
    ],
    dateSelectors: [
        '.event-date',
        '.date',
        'time',
        '.performance-date',
        '[class*="date"]'
    ],
    imagePriority: 'high'
});
