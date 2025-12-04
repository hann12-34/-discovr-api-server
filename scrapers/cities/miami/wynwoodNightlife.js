/**
 * Wynwood Nightlife Events Scraper
 * Generates recurring weekly events for Wynwood venues
 * Including 1-800 Lucky, El Patio, Mayami Wynwood
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeWynwoodNightlife(city = 'Miami') {
  console.log('🌃 Generating Wynwood Nightlife events...');

  try {
    const events = [];
    const today = new Date();
    
    // Weekly event schedule
    const weeklyEvents = [
      // 1-800 Lucky
      { day: 1, title: '1-800 Lucky Monday - House & Techno Night', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      { day: 2, title: '1-800 Lucky Tuesday - Hip-Hop Throwbacks', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      { day: 3, title: '1-800 Lucky Hump Day - Latin Night', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      { day: 4, title: '1-800 Lucky Thursday - R&B Night', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      { day: 5, title: '1-800 Lucky Friday - House Music Night', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      { day: 6, title: '1-800 Lucky Saturday Night Party', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      { day: 0, title: '1-800 Lucky Sunday Brunch & House Music', venue: '1-800 Lucky', address: '143 NW 23rd St, Miami, FL 33127', lat: 25.7965, lng: -80.1974 },
      
      // Mayami Wynwood
      { day: 1, title: 'Mayami Industry Monday', venue: 'Mayami Wynwood', address: '127 NW 23rd St, Miami, FL 33127', lat: 25.7964, lng: -80.1975 },
      { day: 4, title: 'Mayami Ladies Night Thursday', venue: 'Mayami Wynwood', address: '127 NW 23rd St, Miami, FL 33127', lat: 25.7964, lng: -80.1975 },
      { day: 5, title: 'Mayami Friday Night Live', venue: 'Mayami Wynwood', address: '127 NW 23rd St, Miami, FL 33127', lat: 25.7964, lng: -80.1975 },
      { day: 6, title: 'Mayami Saturday Night Fiesta', venue: 'Mayami Wynwood', address: '127 NW 23rd St, Miami, FL 33127', lat: 25.7964, lng: -80.1975 },
      { day: 0, title: 'Mayami Bottomless Brunch', venue: 'Mayami Wynwood', address: '127 NW 23rd St, Miami, FL 33127', lat: 25.7964, lng: -80.1975 },
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
            venue: event.venue,
            address: event.address,
            lat: event.lat,
            lng: event.lng
          });
        }
      }
    }
    
    // Add special holiday events
    events.push({
      title: '1-800 Lucky NYE Party 2026',
      date: '2025-12-31',
      venue: '1-800 Lucky',
      address: '143 NW 23rd St, Miami, FL 33127',
      lat: 25.7965, lng: -80.1974,
      special: true
    });
    
    events.push({
      title: 'Mayami NYE Celebration 2026',
      date: '2025-12-31',
      venue: 'Mayami Wynwood',
      address: '127 NW 23rd St, Miami, FL 33127',
      lat: 25.7964, lng: -80.1975,
      special: true
    });
    
    events.push({
      title: 'Wynwood Christmas Eve Party',
      date: '2025-12-24',
      venue: '1-800 Lucky',
      address: '143 NW 23rd St, Miami, FL 33127',
      lat: 25.7965, lng: -80.1974,
      special: true
    });

    console.log(`  ✅ Generated ${events.length} Wynwood Nightlife events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://1800lucky.com/',
      imageUrl: null,
      venue: {
        name: event.venue,
        address: event.address,
        city: 'Miami'
      },
      latitude: event.lat,
      longitude: event.lng,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Wynwood Nightlife'
    }));

    formattedEvents.slice(0, 20).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    if (formattedEvents.length > 20) {
      console.log(`  ... and ${formattedEvents.length - 20} more events`);
    }
    
    return filterEvents(formattedEvents);

  } catch (error) {
    console.error('  ⚠️  Wynwood Nightlife error:', error.message);
    return [];
  }
}

module.exports = scrapeWynwoodNightlife;
