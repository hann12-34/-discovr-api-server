const { createUniversalScraper } = require('./universal-scraper-template');

module.exports = createUniversalScraper({
    name: 'Club Unity',
    url: 'https://www.clubunitymontreal.com/events',
    city: 'Montreal',
    eventSelectors: [
        '.event-card',
        '.event-item',
        'article.event',
        '.tribe-events-list-event',
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
    imagePriority: 'medium'
});
