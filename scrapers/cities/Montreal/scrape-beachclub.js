const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Beachclub',
    url: 'https://www.beachclubmtl.com/programmation',
    city: 'Montreal',
    eventSelectors: [
        '.event-card',
        '.event-item',
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
