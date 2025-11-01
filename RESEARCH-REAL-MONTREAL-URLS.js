const axios = require('axios');

// Research REAL event URLs for Montreal venues
const montrealVenueResearch = [
  { name: 'Bell Centre', attempts: ['https://www.centrebell.ca/en/events', 'https://www.centrebell.ca/calendrier/', 'https://www.ticketmaster.ca/bell-centre-tickets-montreal/venue/55262'] },
  { name: 'Place des Arts', attempts: ['https://placedesarts.com/en/events', 'https://placedesarts.com/fr/programmation', 'https://placedesarts.com/evenements'] },
  { name: 'MTELUS', attempts: ['https://www.mtelus.com/en/events', 'https://www.evenko.ca/en/events/venue/mtelus', 'https://www.ticketweb.ca/venue/mtelus-montreal-qc/20001'] },
  { name: 'Corona Theatre', attempts: ['https://www.theatrecorona.com/en/events', 'https://www.theatrecorona.com/evenements', 'https://www.evenko.ca/en/events/venue/theatre-corona'] },
  { name: 'Theatre St-Denis', attempts: ['https://www.theatrestdenis.com/en/shows', 'https://www.theatrestdenis.com/spectacles', 'https://admission.com/en/venues/theatre-st-denis'] },
  { name: 'Olympia', attempts: ['https://olympiamontreal.com/en/events/', 'https://olympiamontreal.com/evenements/', 'https://www.evenko.ca/en/events/venue/olympia-de-montreal'] },
  { name: 'New City Gas', attempts: ['https://newcitygas.com/events/', 'https://www.evenko.ca/en/events/venue/new-city-gas'] },
  { name: 'Stereo Nightclub', attempts: ['https://stereo-nightclub.com/en/events/', 'https://stereo-nightclub.com/evenements/', 'https://ra.co/clubs/6106/events'] },
  { name: 'Club Soda', attempts: ['https://clubsoda.ca/spectacles/', 'https://clubsoda.ca/en/shows', 'https://www.evenko.ca/en/events/venue/club-soda'] },
  { name: 'Foufounes Electriques', attempts: ['https://foufounes.ca/agenda/', 'https://foufounes.ca/en/calendar', 'https://www.facebook.com/FoufounesElectriques/events'] },
  { name: 'Bar Le Ritz', attempts: ['https://www.barleritzpdb.com/events', 'https://www.barleritzpdb.com/evenements', 'https://www.ticketweb.ca/venue/bar-le-ritz-pdb-montreal-qc/489'] },
  { name: 'Casa del Popolo', attempts: ['https://www.casadelpopolo.com/en/events', 'https://www.casadelpopolo.com/evenements'] },
  { name: 'Turbo Hauss', attempts: ['https://turbohauss.com/en/events/', 'https://turbohauss.com/evenements/'] },
  { name: 'Fairmount Theatre', attempts: ['https://fairmounttheatre.ca/en/events/', 'https://fairmounttheatre.ca/evenements/'] },
  { name: 'Diving Bell Social', attempts: ['https://www.divingbellsocial.com/', 'https://www.divingbellsocial.com/events'] },
  { name: 'Newspeak', attempts: ['https://newspeakmontreal.com/', 'https://newspeakmontreal.com/events', 'https://ra.co/clubs/108766/events'] },
  { name: 'PHI Centre', attempts: ['https://phi.ca/en/events/', 'https://phi.ca/evenements/'] },
  { name: 'Monument-National', attempts: ['https://www.monument-national.com/en/shows', 'https://www.monument-national.com/spectacles'] }
];

async function testUrl(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8'
      }
    });
    
    if (response.status === 200) {
      const hasEventKeywords = response.data.toLowerCase().includes('event') || 
                               response.data.toLowerCase().includes('spectacle') ||
                               response.data.toLowerCase().includes('show');
      return { 
        status: 'success', 
        code: 200,
        hasKeywords: hasEventKeywords,
        length: response.data.length 
      };
    }
    return { status: 'failed', code: response.status };
  } catch (error) {
    return { 
      status: 'failed', 
      error: error.code || error.message.substring(0, 30)
    };
  }
}

async function researchMontrealVenues() {
  console.log('🔍 Researching REAL event URLs for Montreal venues...\n');
  
  const results = [];
  
  for (const venue of montrealVenueResearch) {
    console.log(`📍 ${venue.name}`);
    let bestUrl = null;
    
    for (const url of venue.attempts) {
      const result = await testUrl(url);
      const status = result.status === 'success' ? '✅' : '❌';
      const extra = result.hasKeywords ? ' [HAS EVENTS]' : '';
      console.log(`   ${url.substring(0, 50)}... - ${status} ${result.code || result.error}${extra}`);
      
      if (result.status === 'success' && result.hasKeywords && !bestUrl) {
        bestUrl = url;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (bestUrl) {
      console.log(`   🎯 Best URL: ${bestUrl}\n`);
      results.push({ name: venue.name, workingUrl: bestUrl });
    } else {
      console.log(`   ⚠️  No working URL found\n`);
      results.push({ name: venue.name, workingUrl: null });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 MONTREAL URL RESEARCH SUMMARY');
  console.log('='.repeat(60));
  
  const withUrls = results.filter(r => r.workingUrl);
  const withoutUrls = results.filter(r => !r.workingUrl);
  
  console.log(`\n✅ Found working URLs: ${withUrls.length}/${montrealVenueResearch.length}`);
  withUrls.forEach(r => console.log(`   ${r.name} → ${r.workingUrl}`));
  
  if (withoutUrls.length > 0) {
    console.log(`\n❌ No working URLs: ${withoutUrls.length}`);
    withoutUrls.forEach(r => console.log(`   ${r.name}`));
  }
  
  const fs = require('fs');
  fs.writeFileSync('MONTREAL_URL_RESEARCH.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to MONTREAL_URL_RESEARCH.json');
  
  return results;
}

researchMontrealVenues().catch(console.error);
