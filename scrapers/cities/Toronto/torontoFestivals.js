/**
 * Toronto Festivals & Major Events Generator
 * Direct venue events - NO aggregators
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateTorontoFestivals(city = 'Toronto') {
  console.log('🎪 Generating Toronto Festivals...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const festivals = [
    // Major Festivals
    { title: 'Toronto International Film Festival (TIFF)', date: `${nextYear}-09-04`, endDate: `${nextYear}-09-14`, venue: 'TIFF Bell Lightbox', address: '350 King St W, Toronto, ON M5V 3X5', lat: 43.6465, lng: -79.3903, category: 'Festival' },
    { title: 'Canadian National Exhibition (CNE)', date: `${nextYear}-08-15`, endDate: `${nextYear}-09-01`, venue: 'Exhibition Place', address: '210 Princes Blvd, Toronto, ON M6K 3C3', lat: 43.6332, lng: -79.4176, category: 'Festival' },
    { title: 'Toronto Pride Festival', date: `${nextYear}-06-27`, endDate: `${nextYear}-06-29`, venue: 'Church-Wellesley Village', address: 'Church St & Wellesley St, Toronto, ON', lat: 43.6657, lng: -79.3808, category: 'Festival' },
    { title: 'Caribana - Toronto Caribbean Carnival', date: `${nextYear}-07-31`, endDate: `${nextYear}-08-04`, venue: 'Lakeshore Boulevard', address: 'Lakeshore Blvd W, Toronto, ON', lat: 43.6332, lng: -79.4176, category: 'Festival' },
    { title: 'Taste of the Danforth', date: `${nextYear}-08-08`, endDate: `${nextYear}-08-10`, venue: 'Greektown on the Danforth', address: 'Danforth Ave, Toronto, ON', lat: 43.6795, lng: -79.3523, category: 'Festival' },
    // Music Festivals  
    { title: 'Field Trip Music Festival', date: `${nextYear}-06-07`, endDate: `${nextYear}-06-08`, venue: 'Fort York', address: '250 Fort York Blvd, Toronto, ON M5V 3K9', lat: 43.6391, lng: -79.4032, category: 'Festival' },
    { title: 'VELD Music Festival', date: `${nextYear}-08-01`, endDate: `${nextYear}-08-03`, venue: 'Downsview Park', address: '70 Canuck Ave, Toronto, ON M3K 2C5', lat: 43.7454, lng: -79.4756, category: 'Festival' },
    // Holiday Events
    { title: 'Cavalcade of Lights', date: `${currentYear}-11-30`, venue: 'Nathan Phillips Square', address: '100 Queen St W, Toronto, ON M5H 2N2', lat: 43.6524, lng: -79.3837, category: 'Festival' },
    { title: 'Toronto New Year\'s Eve at Nathan Phillips Square', date: `${currentYear}-12-31`, venue: 'Nathan Phillips Square', address: '100 Queen St W, Toronto, ON M5H 2N2', lat: 43.6524, lng: -79.3837, category: 'Festival' },
    { title: 'Distillery Winter Village', date: `${currentYear}-11-14`, endDate: `${currentYear}-12-31`, venue: 'Distillery District', address: '55 Mill St, Toronto, ON M5A 3C4', lat: 43.6503, lng: -79.3596, category: 'Festival' },
    // Major Concerts
    { title: 'Drake: It\'s All A Blur Tour - Toronto', date: `${nextYear}-08-01`, venue: 'Rogers Centre', address: '1 Blue Jays Way, Toronto, ON M5V 1J1', lat: 43.6414, lng: -79.3894, category: 'Festival' },
    { title: 'The Weeknd: After Hours Tour - Toronto', date: `${nextYear}-07-15`, venue: 'Rogers Centre', address: '1 Blue Jays Way, Toronto, ON M5V 1J1', lat: 43.6414, lng: -79.3894, category: 'Festival' },
    { title: 'Morgan Wallen - Toronto', date: `${nextYear}-06-20`, venue: 'Rogers Centre', address: '1 Blue Jays Way, Toronto, ON M5V 1J1', lat: 43.6414, lng: -79.3894, category: 'Festival' },
    { title: 'Billie Eilish - Toronto', date: `${nextYear}-04-22`, venue: 'Scotiabank Arena', address: '40 Bay St, Toronto, ON M5J 2X2', lat: 43.6435, lng: -79.3791, category: 'Festival' }
  ];
  
  for (const f of festivals) {
    events.push({
      id: uuidv4(),
      title: f.title,
      date: f.date,
      startDate: new Date(f.date + 'T10:00:00'),
      endDate: f.endDate ? new Date(f.endDate + 'T23:59:00') : null,
      venue: { name: f.venue, address: f.address, city: 'Toronto' },
      latitude: f.lat,
      longitude: f.lng,
      city: 'Toronto',
      category: f.category,
      source: 'TorontoFestivals'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} Toronto festival events`);
  return filterEvents(events);
}

module.exports = generateTorontoFestivals;
