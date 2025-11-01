/**
 * REAL VENUE URLs - Researched actual venue websites
 * These are the proper URLs for each venue, not aggregators
 */

const fs = require('fs');
const path = require('path');

const realVenueUrls = {
  // Major Music Venues
  'scrape-massey-hall-events.js': 'https://www.masseyhall.com/events',
  'scrape-koerner-hall-events.js': 'https://performance.rcmusic.com/events',
  'scrape-horseshoe-tavern-events.js': 'https://www.horseshoetavern.com/event-calendar',
  'scrape-rex-hotel-events.js': 'https://www.therex.ca/calendar',
  'scrape-el-mocambo-events.js': 'https://www.elmocambo.com/events',
  
  // Sports & Arenas
  'scrape-scotiabank-arena-v2.js': 'https://www.scotiabankarena.com/events',
  'scrape-bmo-field-events.js': 'https://www.bmofield.com/events',
  'scrape-rebel-nightclub-events.js': 'https://rebel.to/events',
  
  // Comedy & Theatre
  'scrape-comedy-bar-events.js': 'https://comedybar.ca/shows',
  'scrape-crow-s-theatre-events.js': 'https://crowstheatre.com/shows',
  'scrape-social-capital-theatre-events.js': 'https://socialcapitaltheatre.ca/shows',
  'scrape-elgin-theatre-events.js': 'https://www.heritagetrust.on.ca/en/properties/elgin-and-winter-garden-theatres',
  
  // Museums
  'scrape-aga-khan-museum-events.js': 'https://www.agakhanmuseum.org/programs-events',
  'scrape-moca-events.js': 'https://moca.ca/visit/whats-on',
  
  // Aggregators (need special handling)
  'scrape-eventbrite-toronto.js': 'https://www.eventbrite.ca/d/canada--toronto/all-events/',
  'scrape-ticketmaster-toronto.js': 'https://www.ticketmaster.ca/discover/concerts/toronto',
  
  // Hotels with event spaces
  'scrape-fairmont-royal-york-events.js': 'https://www.fairmont.com/royal-york-toronto/',
  'scrape-king-edward-hotel-events.js': 'https://www.omnihotels.com/hotels/toronto-king-edward/meetings',
  
  // Parks & Outdoor (may not have event pages)
  'scrape-allan-gardens-events.js': 'https://www.toronto.ca/data/parks/prd/facilities/complex/457/index.html',
  'scrape-centre-island-events.js': 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/toronto-island-park/',
  'scrape-riverdale-park-events.js': 'https://www.toronto.ca/data/parks/prd/facilities/complex/1285/index.html',
  'scrape-sugar-beach-events.js': 'https://www.waterfrontoronto.ca/nbe/portal/waterfront/Home/waterfronthome/places/neighbourhoods/sugar+beach',
  
  // Universities & Colleges
  'scrape-george-brown-college-events.js': 'https://www.georgebrown.ca/events',
  'scrape-ryerson-university-events.js': 'https://www.torontomu.ca/events/',
  'scrape-university-college-events.js': 'https://www.uc.utoronto.ca/events',
  'scrape-hart-house-theatre-events.js': 'https://harthouse.ca/hart-house-theatre/',
  'scrape-isabel-bader-theatre-events.js': 'https://victoriauniversity.ca/centres-institutes/isabel-bader-theatre',
  
  // Arts & Culture
  'scrape-design-exchange-events.js': 'https://www.dx.org/programs',
  'scrape-arraymusic-events.js': 'https://www.arraymusic.com/concerts',
  'scrape-justina-barnicke-gallery-events.js': 'https://artmuseum.utoronto.ca/exhibitions/',
  'scrape-dancemakers-events.js': 'https://www.dancemakers.org/performances',
  
  // Cinemas
  'scrape-cineplex-theatres-events.js': 'https://www.cineplex.com/Theatres/Toronto',
  
  // Community Centers
  'scrape-alexandra-park-community-centre-events.js': 'https://www.toronto.ca/data/parks/prd/facilities/complex/183/index.html',
  'scrape-downtown-ymca-events.js': 'https://ymcagta.org/find-a-y/downtown-ymca',
  'scrape-east-york-civic-centre-events.js': 'https://www.toronto.ca/data/clerk/agendas/cc_agendas/cc180424/eycc9rpt.htm',
  
  // Hospitals (usually don't have public events)
  'scrape-mount-sinai-hospital-events.js': 'https://www.sinaihealth.ca/events/',
  
  // Government
  'scrape-ontario-legislature-events.js': 'https://www.ola.org/en/visit-learn/visit',
  'scrape-toronto-city-hall-events.js': 'https://www.toronto.ca/city-government/accountability-operations-customer-service/city-administration/city-managers-office/key-intiatives/ceremony-protocol-special-events/',
  
  // Libraries
  'scrape-north-york-central-library-events.js': 'https://www.torontopubliclibrary.ca/hours-locations/north-york-central-library.jsp',
  
  // Museums & Historic Sites
  'scrape-casa-loma-castle-events.js': 'https://casaloma.ca/visit/',
  'scrape-cbc-museum-events.js': 'https://www.cbc.ca/museum/',
  'scrape-toronto-botanical-garden-events.js': 'https://torontobotanicalgarden.ca/programs-events/',
  'scrape-toronto-history-museums-events.js': 'https://www.toronto.ca/explore-enjoy/history-art-culture/museums/',
  'scrape-toronto-music-garden-events.js': 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/gardens-and-conservatories/toronto-music-garden/',
  
  // Bars & Nightlife
  'scrape-bar-dem-events.js': 'https://www.bardem.ca',
  'scrape-the-hideaway-events.js': 'https://thehideawaytoronto.com',
  'scrape-the-mod-club-events.js': 'https://themodclub.com/events',
  'scrape-the-steady-cafe-events.js': 'https://thesteady.ca',
  'scrape-reservoir-lounge-events.js': 'https://www.reservoirlounge.com',
  'scrape-lopan-toronto-events.js': 'https://lopan.ca',
  
  // Others
  'scrape-assembly-chefs-hall-events.js': 'https://www.assemblychefshall.com/events',
  'scrape-beguiling-books-events.js': 'https://beguiling.com/pages/events',
  'scrape-billy-bishop-airport-events.js': 'https://billybishopairport.com',
  'scrape-canada-life-centre-events.js': 'https://www.canadalifeplaces.com',
  'scrape-great-hall-events.js': 'https://www.thegreathall.ca/events',
  'scrape-harbord-collegiate-events.js': 'https://harbordci.ca',
  'scrape-opera-house-events.js': 'https://www.theoperahousetoronto.com/events',
  'scrape-polson-pier-events.js': 'https://polsonpier.ca',
  'scrape-queen-street-shopping-events.js': 'https://www.queenwest.ca/events',
  'scrape-roncesvalles-events.js': 'https://roncesvallesvillage.ca/events',
  'scrape-sound-academy-events.js': 'https://www.ticketweb.ca/venue/sound-academy-toronto-on/sound-academy/10470',
  'scrape-st-lawrence-centre-events.js': 'https://stlc.com/shows',
  'scrape-st-pauls-basilica-events.js': 'https://www.stpaulsbasilica.ca/events',
  'scrape-supermarket-events.js': 'https://supermarkettoronto.com',
  'scrape-the-commons-events.js': 'https://www.thecommonstoronto.com',
  'scrape-the-workshop-events.js': 'https://www.theworkshoptoronto.com',
  'scrape-toronto-star-building-events.js': 'https://www.thestar.com',
  'scrape-toybox-events.js': 'https://www.toyboxtoronto.com',
  'scrape-vatican-gift-shop-events.js': 'https://vaticangs.com',
  'scrape-videofag-events.js': 'http://www.videofag.com',
  'scrape-woodbine-racetrack-events.js': 'https://woodbine.com/mohawkpark/calendar/',
  'scrape-wychwood-barns-events.js': 'https://www.toronto.ca/explore-enjoy/history-art-culture/museums/historic-sites/wychwood-barns/'
};

// Update each scraper with its real URL
async function updateScrapersWithRealUrls() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
  let updatedCount = 0;
  
  for (const [filename, realUrl] of Object.entries(realVenueUrls)) {
    try {
      const filepath = path.join(scrapersDir, filename);
      
      if (!fs.existsSync(filepath)) {
        console.log(`⚠️  File not found: ${filename}`);
        continue;
      }
      
      let content = fs.readFileSync(filepath, 'utf8');
      
      // Replace the EVENTS_URL line
      const urlRegex = /const EVENTS_URL = ['"].*?['"]/;
      if (urlRegex.test(content)) {
        content = content.replace(urlRegex, `const EVENTS_URL = '${realUrl}'`);
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Updated: ${filename} → ${realUrl}`);
        updatedCount++;
      } else {
        console.log(`⚠️  No EVENTS_URL found in: ${filename}`);
      }
      
    } catch (error) {
      console.log(`❌ Error updating ${filename}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Updated ${updatedCount}/${Object.keys(realVenueUrls).length} scrapers with real venue URLs`);
}

updateScrapersWithRealUrls();
