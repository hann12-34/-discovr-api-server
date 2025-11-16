const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'L\'Astral',
    url: 'https://sallelastral.com/en/events',
    city: 'Montreal',
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
        '[class*="date"]'
    ],
    imagePriority: 'medium'
});
