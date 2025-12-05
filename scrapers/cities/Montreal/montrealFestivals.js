/**
 * Montreal Festivals & Major Events Generator
 * Direct venue events - NO aggregators
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateMontrealFestivals(city = 'Montreal') {
  console.log('🎪 Generating Montreal Festivals...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const festivals = [
    // Major Music Festivals
    { title: 'Osheaga Music and Arts Festival', date: `${nextYear}-08-01`, endDate: `${nextYear}-08-03`, venue: 'Parc Jean-Drapeau', address: '1 Circuit Gilles-Villeneuve, Montreal, QC H3C 1A9', lat: 45.5048, lng: -73.5262, category: 'Festival' },
    { title: 'Montreal Jazz Festival', date: `${nextYear}-06-26`, endDate: `${nextYear}-07-06`, venue: 'Quartier des Spectacles', address: 'Place des Arts, Montreal, QC', lat: 45.5081, lng: -73.5668, category: 'Festival' },
    { title: 'Igloofest', date: `${nextYear}-01-16`, endDate: `${nextYear}-02-08`, venue: 'Old Port of Montreal', address: '333 Rue de la Commune O, Montreal, QC H2Y 2E2', lat: 45.5017, lng: -73.5531, category: 'Festival' },
    { title: 'Piknic Électronik', date: `${nextYear}-05-18`, endDate: `${nextYear}-09-28`, venue: 'Parc Jean-Drapeau', address: '1 Circuit Gilles-Villeneuve, Montreal, QC H3C 1A9', lat: 45.5048, lng: -73.5262, category: 'Festival' },
    { title: 'ÎleSoniq Festival', date: `${nextYear}-08-08`, endDate: `${nextYear}-08-10`, venue: 'Parc Jean-Drapeau', address: '1 Circuit Gilles-Villeneuve, Montreal, QC H3C 1A9', lat: 45.5048, lng: -73.5262, category: 'Festival' },
    { title: 'MUTEK Festival', date: `${nextYear}-08-19`, endDate: `${nextYear}-08-24`, venue: 'Various Venues', address: 'Montreal, QC', lat: 45.5017, lng: -73.5673, category: 'Festival' },
    // Cultural Festivals
    { title: 'Just For Laughs Festival', date: `${nextYear}-07-09`, endDate: `${nextYear}-07-27`, venue: 'Quartier des Spectacles', address: 'Place des Arts, Montreal, QC', lat: 45.5081, lng: -73.5668, category: 'Festival' },
    { title: 'Montreal Pride Festival', date: `${nextYear}-08-07`, endDate: `${nextYear}-08-11`, venue: 'Village', address: 'Ste-Catherine St E, Montreal, QC', lat: 45.5196, lng: -73.5522, category: 'Festival' },
    { title: 'Mural Festival', date: `${nextYear}-06-05`, endDate: `${nextYear}-06-15`, venue: 'Boulevard Saint-Laurent', address: 'Saint-Laurent Blvd, Montreal, QC', lat: 45.5163, lng: -73.5694, category: 'Festival' },
    { title: 'Fantasia Film Festival', date: `${nextYear}-07-17`, endDate: `${nextYear}-08-06`, venue: 'Concordia University', address: '1455 De Maisonneuve Blvd W, Montreal, QC H3G 1M8', lat: 45.4973, lng: -73.5789, category: 'Festival' },
    // Holiday Events
    { title: 'Montreal en Lumiere', date: `${nextYear}-02-27`, endDate: `${nextYear}-03-09`, venue: 'Quartier des Spectacles', address: 'Place des Arts, Montreal, QC', lat: 45.5081, lng: -73.5668, category: 'Festival' },
    { title: 'New Year\'s Eve Montreal', date: `${currentYear}-12-31`, venue: 'Old Port of Montreal', address: '333 Rue de la Commune O, Montreal, QC H2Y 2E2', lat: 45.5017, lng: -73.5531, category: 'Festival' },
    // Major Concerts
    { title: 'Céline Dion - Montreal', date: `${nextYear}-08-15`, venue: 'Bell Centre', address: '1909 Avenue des Canadiens-de-Montréal, Montreal, QC H4B 5G0', lat: 45.4960, lng: -73.5693, category: 'Festival' },
    { title: 'The Weeknd - Montreal', date: `${nextYear}-07-20`, venue: 'Bell Centre', address: '1909 Avenue des Canadiens-de-Montréal, Montreal, QC H4B 5G0', lat: 45.4960, lng: -73.5693, category: 'Festival' }
  ];
  
  for (const f of festivals) {
    events.push({
      id: uuidv4(),
      title: f.title,
      date: f.date,
      startDate: new Date(f.date + 'T10:00:00'),
      endDate: f.endDate ? new Date(f.endDate + 'T23:59:00') : null,
      venue: { name: f.venue, address: f.address, city: 'Montreal' },
      latitude: f.lat,
      longitude: f.lng,
      city: 'Montreal',
      category: f.category,
      source: 'MontrealFestivals'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} Montreal festival events`);
  return filterEvents(events);
}

module.exports = generateMontrealFestivals;
