const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Metropolis',
    url: 'https://www.admission.com/venue/metropolis',
    city: 'Montreal',
    eventSelectors: [
        '.event-card',
        '.show-card',
        'article.event',
        '.event-item',
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
    imagePriority: 'high'
});
