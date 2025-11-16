const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Bell Centre',
    url: 'https://www.centrebell.ca/en/calendar',
    city: 'Montreal',
    eventSelectors: [
        '.event-card',
        '.calendar-event',
        'article.event',
        '.event-item',
        '[class*="event"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.event-name',
        'a[href*="/event"]'
    ],
    dateSelectors: [
        '.event-date',
        '.date',
        'time',
        '.event-time',
        '[class*="date"]'
    ],
    imagePriority: 'high'
});
