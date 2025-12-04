/**
 * Clevelander South Beach Events Scraper
 * Iconic South Beach party venue with pool parties and nightlife
 * Generates weekly recurring events based on their schedule
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeClevelander(city = 'Miami') {
  console.log('🏖️  Generating Clevelander South Beach events...');

  try {
    const events = [];
    const today = new Date();
    
    // Clevelander weekly events based on their schedule
    const weeklyEvents = [
      { day: 0, title: 'Clevelander Sunday Funday Pool Party', type: 'pool' },
      { day: 1, title: 'Clevelander Monday Night Football', type: 'sports' },
      { day: 2, title: 'Clevelander Tuesday Beach Party', type: 'pool' },
      { day: 3, title: 'Clevelander Hump Day Party', type: 'nightlife' },
      { day: 4, title: 'Clevelander Thursday Night Live', type: 'nightlife' },
      { day: 5, title: 'Clevelander Friday Night Party', type: 'nightlife' },
      { day: 6, title: 'Clevelander Saturday Pool Party', type: 'pool' },
      { day: 6, title: 'Clevelander Saturday Night Party', type: 'nightlife' },
    ];
    
    // Generate events for the next 6 weeks
    for (let i = 0; i < 42; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      const isoDate = date.toISOString().split('T')[0];
      
      for (const event of weeklyEvents) {
        if (event.day === dayOfWeek) {
          events.push({
            title: event.title,
            date: isoDate,
            type: event.type
          });
        }
      }
    }
    
    // Add special holiday events
    events.push({
      title: 'Clevelander NYE 2026 Countdown Party',
      date: '2025-12-31',
      type: 'special'
    });
    
    events.push({
      title: 'Clevelander Christmas Beach Bash',
      date: '2025-12-25',
      type: 'special'
    });

    console.log(`  ✅ Generated ${events.length} Clevelander events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://clevelander.com/events/',
      imageUrl: null,
      venue: {
        name: 'Clevelander South Beach',
        address: '1020 Ocean Drive, Miami Beach, FL 33139',
        city: 'Miami'
      },
      latitude: 25.7799,
      longitude: -80.1302,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Clevelander'
    }));

    formattedEvents.slice(0, 15).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    if (formattedEvents.length > 15) {
      console.log(`  ... and ${formattedEvents.length - 15} more events`);
    }
    
    return filterEvents(formattedEvents);

  } catch (error) {
    console.error('  ⚠️  Clevelander error:', error.message);
    return [];
  }
}

module.exports = scrapeClevelander;
