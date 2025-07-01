const axios = require('axios');
const cheerio = require('cheerio');

const VENUE_URL = 'https://www.roxyvan.com/events';

// Add metadata required by the scraper system
const sourceIdentifier = 'the-roxy';
const name = 'The Roxy';

async function scrapeRoxy() {
    try {
        const { data } = await axios.get(VENUE_URL);
        const $ = cheerio.load(data);
        const events = [];
        
        // The events are in a series of <p> tags within this div
        const eventParagraphs = $('div.sqs-block-content p');
        let currentEvent = null;

        eventParagraphs.each((i, p) => {
            let line = $(p).text().trim();
            
            if (!line) return; // Skip empty lines

            // Check if the line is a date, indicating a new event
            if (line.match(/^\s*(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),?\s+[A-Z]+\s+\d{1,2}/i)) {
                if (currentEvent) {
                    events.push(currentEvent);
                }
                const eventData = {
                    date: line,
                    title: '',
                    venue: {
                        name: 'The Roxy',
                        id: 'the-roxy',
                        address: '932 Granville St',
                        city: 'Vancouver',
                        state: 'BC',
                        country: 'Canada',
                        postalCode: 'V6Z 1K2',
                        coordinates: {
                            lat: 49.2795,
                            lng: -123.1213
                        }
                    },
                    url: VENUE_URL,
                    source: sourceIdentifier,
                    time: 'N/A',
                    price: 'N/A',
                    descriptionLines: []
                };
                currentEvent = eventData;
            } else if (currentEvent) {
                currentEvent.descriptionLines.push(line);
            }
        });

        if (currentEvent) {
            events.push(currentEvent);
        }

        // Post-process each event to extract details
        events.forEach(event => {
            if (event.descriptionLines.length > 0) {
                event.title = event.descriptionLines[0];

                if (event.title.toUpperCase().includes('THE ROXY AND LIVE ACTS CANADA PRESENT') && event.descriptionLines.length > 1) {
                    event.title = event.descriptionLines[1];
                }
                
                event.title = event.title.replace(/tickets$/i, '').trim();

                const fullDescription = event.descriptionLines.join('\n').toUpperCase();

                const doorsMatch = fullDescription.match(/DOORS\s@\s(.*?)(?:\n|$)/);
                if (doorsMatch && doorsMatch[1]) {
                    event.time = doorsMatch[1].trim();
                } else {
                    const eventDoorsMatch = fullDescription.match(/EVENT DOORS:\s(.*?)(?:\n|$)/);
                    if (eventDoorsMatch && eventDoorsMatch[1]) {
                        event.time = eventDoorsMatch[1].trim();
                    }
                }

                const priceMatch = fullDescription.match(/\$\d+\sADV.*DOOR/);
                if (priceMatch && priceMatch[0]) {
                    event.price = priceMatch[0];
                } else {
                    const doorPriceMatch = fullDescription.match(/\$\d+\s@\sDOOR/);
                    if (doorPriceMatch && doorPriceMatch[0]) {
                        event.price = doorPriceMatch[0];
                    }
                }
            }
            delete event.descriptionLines;
        });

        return events.filter(event => event.title);

    } catch (error) {
        console.error('Error scraping The Roxy:', error);
        return [];
    }
}

module.exports = {
    scrape: scrapeRoxy,
    sourceIdentifier,
    name
};
