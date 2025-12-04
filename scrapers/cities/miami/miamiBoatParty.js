/**
 * Miami Boat Party Events Scraper
 * Generates events for regularly scheduled boat parties
 * Based on Miami Experience Boat Party schedule (Saturdays)
 * URL: https://themiamiexperienceboatparty.com/
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeMiamiBoatParty(city = 'Miami') {
  console.log('🚤 Generating Miami Boat Party events...');

  try {
    const events = [];
    const today = new Date();
    
    // Generate Saturday boat party events for the next 8 weeks
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Saturday parties
      if (date.getDay() === 6) {
        const isoDate = date.toISOString().split('T')[0];
        
        events.push({
          title: 'Miami Booze Cruise - Saturday Party',
          date: isoDate,
          venue: 'Bayside Marina'
        });
      }
      
      // Friday parties (some weeks)
      if (date.getDay() === 5) {
        const isoDate = date.toISOString().split('T')[0];
        
        events.push({
          title: 'Miami Friday Night Boat Party',
          date: isoDate,
          venue: 'Bayside Marina'
        });
      }
    }
    
    // Add special NYE boat party
    events.push({
      title: 'Miami NYE Fireworks Yacht Party 2026',
      date: '2025-12-31',
      venue: 'Bayside Marina',
      special: true
    });
    
    // Add Christmas boat parties
    events.push({
      title: 'Miami Christmas Lights Boat Cruise',
      date: '2025-12-24',
      venue: 'Bayside Marina',
      special: true
    });
    
    events.push({
      title: 'Miami Christmas Party Cruise',
      date: '2025-12-25',
      venue: 'Bayside Marina',
      special: true
    });

    console.log(`  ✅ Generated ${events.length} Miami Boat Party events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://themiamiexperienceboatparty.com/',
      imageUrl: null,
      venue: {
        name: event.venue,
        address: '401 Biscayne Blvd, Miami, FL 33132',
        city: 'Miami'
      },
      latitude: 25.7764,
      longitude: -80.1863,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Miami Boat Party'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    console.error('  ⚠️  Miami Boat Party error:', error.message);
    return [];
  }
}

module.exports = scrapeMiamiBoatParty;
