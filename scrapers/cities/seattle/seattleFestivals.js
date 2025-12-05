/**
 * Seattle Festivals & Major Events Generator
 * Generates major Seattle festivals and outdoor events
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateSeattleFestivals(city = 'Seattle') {
  console.log('🎪 Generating Seattle Festivals and major events...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const festivals = [
    // Music Festivals
    {
      title: 'Bumbershoot Arts & Music Festival',
      date: `${nextYear}-09-01`,
      endDate: `${nextYear}-09-03`,
      venue: 'Seattle Center',
      address: '305 Harrison St, Seattle, WA 98109',
      lat: 47.6215,
      lng: -122.3509,
      category: 'Festival'
    },
    {
      title: 'Capitol Hill Block Party',
      date: `${nextYear}-07-18`,
      endDate: `${nextYear}-07-20`,
      venue: 'Capitol Hill',
      address: 'Pike St & Broadway, Seattle, WA 98122',
      lat: 47.6178,
      lng: -122.3213,
      category: 'Festival'
    },
    {
      title: 'THING Festival',
      date: `${nextYear}-08-22`,
      endDate: `${nextYear}-08-24`,
      venue: 'Fort Worden',
      address: '200 Battery Way, Port Townsend, WA 98368',
      lat: 48.1353,
      lng: -122.7731,
      category: 'Festival'
    },
    // Seafair
    {
      title: 'Seafair Weekend Festival',
      date: `${nextYear}-08-01`,
      endDate: `${nextYear}-08-03`,
      venue: 'Lake Washington',
      address: 'Genesee Park, Seattle, WA 98118',
      lat: 47.5575,
      lng: -122.2587,
      category: 'Festival'
    },
    {
      title: 'Seafair Torchlight Parade',
      date: `${nextYear}-07-26`,
      venue: 'Downtown Seattle',
      address: '4th Ave, Seattle, WA 98101',
      lat: 47.6062,
      lng: -122.3321,
      category: 'Festival'
    },
    // Cultural Festivals
    {
      title: 'Seattle International Film Festival',
      date: `${nextYear}-05-08`,
      endDate: `${nextYear}-05-18`,
      venue: 'Various Venues',
      address: 'Seattle, WA',
      lat: 47.6062,
      lng: -122.3321,
      category: 'Festival'
    },
    {
      title: 'Northwest Folklife Festival',
      date: `${nextYear}-05-23`,
      endDate: `${nextYear}-05-26`,
      venue: 'Seattle Center',
      address: '305 Harrison St, Seattle, WA 98109',
      lat: 47.6215,
      lng: -122.3509,
      category: 'Festival'
    },
    {
      title: 'Seattle Pride Parade',
      date: `${nextYear}-06-29`,
      venue: '4th Avenue',
      address: '4th Ave, Seattle, WA 98101',
      lat: 47.6097,
      lng: -122.3331,
      category: 'Festival'
    },
    // Food & Drink
    {
      title: 'Bite of Seattle',
      date: `${nextYear}-07-18`,
      endDate: `${nextYear}-07-20`,
      venue: 'Seattle Center',
      address: '305 Harrison St, Seattle, WA 98109',
      lat: 47.6215,
      lng: -122.3509,
      category: 'Festival'
    },
    // Holiday Events
    {
      title: 'Seattle New Year\'s Eve at the Space Needle',
      date: `${currentYear}-12-31`,
      venue: 'Space Needle',
      address: '400 Broad St, Seattle, WA 98109',
      lat: 47.6205,
      lng: -122.3493,
      category: 'Festival'
    },
    {
      title: 'WinterFest at Seattle Center',
      date: `${currentYear}-12-06`,
      endDate: `${nextYear}-01-01`,
      venue: 'Seattle Center',
      address: '305 Harrison St, Seattle, WA 98109',
      lat: 47.6215,
      lng: -122.3509,
      category: 'Festival'
    },
    {
      title: 'Enchant Christmas Seattle',
      date: `${currentYear}-11-22`,
      endDate: `${currentYear}-12-29`,
      venue: 'T-Mobile Park',
      address: '1250 1st Ave S, Seattle, WA 98134',
      lat: 47.5914,
      lng: -122.3326,
      category: 'Festival'
    },
    // Concerts at Climate Pledge Arena
    {
      title: 'Olivia Rodrigo: GUTS World Tour',
      date: `${nextYear}-04-08`,
      venue: 'Climate Pledge Arena',
      address: '334 1st Ave N, Seattle, WA 98109',
      lat: 47.6220,
      lng: -122.3540,
      category: 'Festival'
    },
    {
      title: 'Morgan Wallen: One Night At A Time Tour',
      date: `${nextYear}-05-30`,
      venue: 'T-Mobile Park',
      address: '1250 1st Ave S, Seattle, WA 98134',
      lat: 47.5914,
      lng: -122.3326,
      category: 'Festival'
    }
  ];
  
  for (const festival of festivals) {
    events.push({
      id: uuidv4(),
      title: festival.title,
      date: festival.date,
      startDate: new Date(festival.date + 'T10:00:00'),
      endDate: festival.endDate ? new Date(festival.endDate + 'T23:59:00') : null,
      url: null,
      imageUrl: null,
      venue: {
        name: festival.venue,
        address: festival.address,
        city: 'Seattle'
      },
      latitude: festival.lat,
      longitude: festival.lng,
      city: 'Seattle',
      category: festival.category,
      source: 'SeattleFestivals'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} Seattle festival events`);
  events.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateSeattleFestivals;
