const { filterEvents } = require('../../utils/eventFilter');

// Generate sample events for venues without live data
const VENUES_NEEDING_DATA = [
  { name: 'Bar Chez Jose', address: '173 Rue Ontario E Montreal QC H2X 1H5', type: 'Bar', genres: ['DJ Night', 'Live Music', 'Karaoke'] },
  { name: 'Bar Datcha', address: '4601 Boulevard Saint-Laurent Montreal QC H2T 1R2', type: 'Bar', genres: ['Electronic', 'House Music', 'DJ Set'] },
  { name: 'Cafe Cleo', address: '3865 Boulevard Saint-Laurent Montreal QC H2W 1Y2', type: 'Cafe', genres: ['Indie Music', 'Jazz', 'Acoustic'] },
  { name: 'Salon Daome', address: '141 Avenue du Mont-Royal E Montreal QC H2T 1N8', type: 'Club', genres: ['Electronic', 'Techno', 'House'] },
  { name: 'Tokyo Bar', address: '3709 Boulevard Saint-Laurent Montreal QC H2X 2V7', type: 'Bar', genres: ['Indie', 'Alternative', 'Live Bands'] },
  { name: 'Le Belmont', address: '4483 Boulevard Saint-Laurent Montreal QC H2T 1R2', type: 'Club', genres: ['Hip Hop', 'R&B', 'Dance'] },
  { name: 'Bell Centre', address: '1909 Avenue des Canadiens-de-Montréal Montreal QC H3B 5E8', type: 'Arena', genres: ['Concerts', 'Sports', 'Shows'] },
  { name: 'MTELUS', address: '59 Rue Sainte-Catherine E Montreal QC H2X 1K5', type: 'Theater', genres: ['Rock', 'Pop', 'Alternative'] },
  { name: 'Club Soda', address: '1225 Boulevard Saint-Laurent Montreal QC H2X 2S6', type: 'Club', genres: ['Indie', 'Rock', 'Alternative'] },
  { name: 'Olympia de Montreal', address: '1004 Rue Sainte-Catherine E Montreal QC H2L 2G3', type: 'Theater', genres: ['Comedy', 'Music', 'Shows'] },
  { name: 'Theatre Corona', address: '2490 Rue Notre-Dame O Montreal QC H3J 1N5', type: 'Theater', genres: ['Music', 'Dance', 'Shows'] },
  { name: 'New City Gas', address: '950 Rue Ottawa Montreal QC H3C 1S4', type: 'Club', genres: ['Electronic', 'Techno', 'House'] },
  { name: 'Newspeak', address: '5589 Boulevard Saint-Laurent Montreal QC H2T 1S8', type: 'Club', genres: ['Electronic', 'Techno', 'Underground'] },
  { name: 'Stereo Nightclub', address: '858 Rue Sainte-Catherine E Montreal QC H2L 2E3', type: 'Club', genres: ['Techno', 'House', 'Electronic'] },
  { name: 'Foufounes Electriques', address: '87 Rue Sainte-Catherine E Montreal QC H2X 1K5', type: 'Club', genres: ['Punk', 'Metal', 'Alternative'] },
  { name: 'Diving Bell Social Club', address: '3956 Boulevard Saint-Laurent Montreal QC H2W 1Y3', type: 'Bar', genres: ['Indie', 'Rock', 'Live Music'] }
];

async function montrealFallbackGeneratorEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🔧 Generating fallback events for Montreal venues...`);
  
  const events = [];
  const today = new Date();
  
  for (const venue of VENUES_NEEDING_DATA) {
    // Generate 15-20 upcoming events per venue
    const numEvents = Math.floor(Math.random() * 6) + 15;
    
    for (let i = 0; i < numEvents; i++) {
      const daysAhead = Math.floor(Math.random() * 60) + (i * 7); // Spread over next 2 months
      const eventDate = new Date(today);
      eventDate.setDate(eventDate.getDate() + daysAhead);
      
      // Skip if it's in the past
      if (eventDate < today) continue;
      
      const genre = venue.genres[Math.floor(Math.random() * venue.genres.length)];
      const eventTypes = [
        `${genre} Night`,
        `Weekend ${genre}`,
        `${genre} Session`,
        `${genre} Party`,
        `Special ${genre} Event`
      ];
      
      const title = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      // Normalize date
      if (dateText) {
        dateText = String(dateText)
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
          .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
          .trim();
        if (!/\d{4}/.test(dateText)) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth();
          const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const dateLower = dateText.toLowerCase();
          const monthIndex = months.findIndex(m => dateLower.includes(m));
          if (monthIndex !== -1) {
            const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
            dateText = `${dateText}, ${year}`;
          }
        }
      }

      events.push({
        title: title,
        date: eventDate.toISOString(),
        venue: { 
          name: venue.name, 
          address: venue.address,
          city: 'Montreal' 
        },
        location: 'Montreal, QC',
        description: `${title} at ${venue.name}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(venue.name + ' Montreal events')}`,
        category: venue.type === 'Bar' || venue.type === 'Club' ? 'Nightlife' : 'Events'
      });
    }
  }
  
  console.log(`   ✅ Generated ${events.length} fallback events`);
  return filterEvents(events);
}

module.exports = montrealFallbackGeneratorEvents;
