const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Saddledome',
    url: 'https://www.scotiabanksaddledome.com/events',
    city: 'Calgary',
    eventSelectors: [
        '.event-card',
        '.event-item',
        'article.event',
        '.tribe-events-list-event-row',
        '[class*="event"]'
    ],
    titleSelectors: [
        'h2',
        'h3',
        '.event-title',
        '.tribe-events-list-event-title',
        'a[href*="/event"]'
    ],
    dateSelectors: [
        '.event-date',
        '.date',
        'time',
        '.tribe-event-date-start',
        '[class*="date"]'
    ],
    imagePriority: 'high'
});
