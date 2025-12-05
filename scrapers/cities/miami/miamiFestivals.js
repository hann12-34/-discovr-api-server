/**
 * Miami Festivals & Major Events Generator
 * Generates major Miami festivals and outdoor events
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateMiamiFestivals(city = 'Miami') {
  console.log('🎪 Generating Miami Festivals and major events...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const festivals = [
    // Music Festivals
    {
      title: 'Ultra Music Festival',
      date: `${nextYear}-03-28`,
      endDate: `${nextYear}-03-30`,
      venue: 'Bayfront Park',
      address: '301 Biscayne Blvd, Miami, FL 33132',
      lat: 25.7743,
      lng: -80.1859,
      category: 'Festival'
    },
    {
      title: 'Rolling Loud Miami',
      date: `${nextYear}-07-25`,
      endDate: `${nextYear}-07-27`,
      venue: 'Hard Rock Stadium',
      address: '347 Don Shula Dr, Miami Gardens, FL 33056',
      lat: 25.9580,
      lng: -80.2389,
      category: 'Festival'
    },
    {
      title: 'III Points Music Festival',
      date: `${nextYear}-02-14`,
      endDate: `${nextYear}-02-16`,
      venue: 'Mana Wynwood',
      address: '2217 NW 5th Ave, Miami, FL 33127',
      lat: 25.8004,
      lng: -80.1994,
      category: 'Festival'
    },
    // Art Basel Week
    {
      title: 'Art Basel Miami Beach',
      date: `${currentYear}-12-06`,
      endDate: `${currentYear}-12-08`,
      venue: 'Miami Beach Convention Center',
      address: '1901 Convention Center Dr, Miami Beach, FL 33139',
      lat: 25.7954,
      lng: -80.1322,
      category: 'Festival'
    },
    {
      title: 'Art Basel Opening Night Party',
      date: `${currentYear}-12-05`,
      venue: 'Faena Hotel Miami Beach',
      address: '3201 Collins Ave, Miami Beach, FL 33140',
      lat: 25.8106,
      lng: -80.1225,
      category: 'Nightlife'
    },
    // Boat Shows
    {
      title: 'Miami International Boat Show',
      date: `${nextYear}-02-12`,
      endDate: `${nextYear}-02-16`,
      venue: 'Miami Marine Stadium',
      address: '3501 Rickenbacker Cswy, Miami, FL 33149',
      lat: 25.7362,
      lng: -80.1682,
      category: 'Festival'
    },
    // Food & Wine
    {
      title: 'South Beach Wine & Food Festival',
      date: `${nextYear}-02-20`,
      endDate: `${nextYear}-02-23`,
      venue: 'Miami Beach',
      address: 'Miami Beach, FL 33139',
      lat: 25.7907,
      lng: -80.1300,
      category: 'Festival'
    },
    // Pride
    {
      title: 'Miami Beach Pride Festival',
      date: `${nextYear}-04-12`,
      endDate: `${nextYear}-04-13`,
      venue: 'Lummus Park',
      address: 'Ocean Dr & 12th St, Miami Beach, FL 33139',
      lat: 25.7814,
      lng: -80.1300,
      category: 'Festival'
    },
    // Calle Ocho
    {
      title: 'Calle Ocho Music Festival',
      date: `${nextYear}-03-09`,
      venue: 'Little Havana',
      address: 'SW 8th St, Miami, FL 33135',
      lat: 25.7656,
      lng: -80.2192,
      category: 'Festival'
    },
    // New Year's Eve
    {
      title: 'Big Orange New Year\'s Eve Countdown',
      date: `${currentYear}-12-31`,
      venue: 'Bayfront Park',
      address: '301 Biscayne Blvd, Miami, FL 33132',
      lat: 25.7743,
      lng: -80.1859,
      category: 'Festival'
    },
    {
      title: 'Fontainebleau New Year\'s Eve Gala',
      date: `${currentYear}-12-31`,
      venue: 'Fontainebleau Miami Beach',
      address: '4441 Collins Ave, Miami Beach, FL 33140',
      lat: 25.8199,
      lng: -80.1218,
      category: 'Nightlife'
    },
    // Winter Music Conference
    {
      title: 'Winter Music Conference',
      date: `${nextYear}-03-24`,
      endDate: `${nextYear}-03-27`,
      venue: 'Faena Forum',
      address: '3420 Collins Ave, Miami Beach, FL 33140',
      lat: 25.8106,
      lng: -80.1225,
      category: 'Festival'
    },
    // Miami Music Week
    {
      title: 'Miami Music Week',
      date: `${nextYear}-03-24`,
      endDate: `${nextYear}-03-30`,
      venue: 'Various Venues Miami',
      address: 'Miami, FL',
      lat: 25.7617,
      lng: -80.1918,
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
        city: 'Miami'
      },
      latitude: festival.lat,
      longitude: festival.lng,
      city: 'Miami',
      category: festival.category,
      source: 'MiamiFestivals'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} Miami festival events`);
  events.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateMiamiFestivals;
