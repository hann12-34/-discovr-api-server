const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'The Comedy Nest',
    url: 'https://www.comedynest.com/en/show-schedule',
    city: 'Montreal',
    eventSelectors: [
        '.event-card',
        '.show-item',
        'article.event',
        '.show',
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
