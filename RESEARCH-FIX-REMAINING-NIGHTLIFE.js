const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Research actual working URLs for remaining venues
const venueResearch = [
  { 
    file: 'scrape-toybox-nightclub-events.js', 
    name: 'Toybox', 
    address: '473 Adelaide St W, Toronto, ON M5V 1T1',
    attempts: [
      'https://www.toyboxclub.com/events',
      'https://www.seetickets.us/venue/toybox/1124',
      'https://ra.co/clubs/69095/events'  // Toybox on RA
    ]
  },
  { 
    file: 'scrape-noir-nightclub-events.js', 
    name: 'Noir', 
    address: '2200 Yonge St, Toronto, ON M4S 2C6',
    attempts: [
      'https://noirtoronto.com/events/',
      'https://www.eventbrite.ca/o/noir-nightclub-toronto-31984891769',
      'https://ra.co/clubs/135828/events'  // Noir on RA
    ]
  },
  { 
    file: 'scrape-nest-nightclub-events.js', 
    name: 'Nest', 
    address: '423 College St, Toronto, ON M5T 1T1',
    attempts: [
      'https://nesttoronto.com/',
      'https://www.instagram.com/nesttoronto/',
      'https://www.eventbrite.ca/o/nest-32456789012'
    ]
  },
  { 
    file: 'scrape-lost-and-found-events.js', 
    name: 'Lost and Found', 
    address: '577 King St W, Toronto, ON M5V 1M1',
    attempts: [
      'https://lostandfoundbar.com/',
      'https://www.instagram.com/lostandfoundbar/',
      'https://www.seetickets.us/venue/lost-found/4531'
    ]
  },
  { 
    file: 'scrape-get-well-bar-events.js', 
    name: 'Get Well', 
    address: '1181 Dundas St W, Toronto, ON M6J 1X3',
    attempts: [
      'https://www.getwellbar.com/',
      'https://www.instagram.com/getwellbar/',
      'https://www.eventbrite.ca/o/get-well-32145678901'
    ]
  },
  { 
    file: 'scrape-regulars-bar-events.js', 
    name: 'Regulars Bar', 
    address: '554 Dundas St W, Toronto, ON M5T 1H5',
    attempts: [
      'https://regularsbar.com/',
      'https://www.instagram.com/regularsbar/',
      'https://www.seetickets.us/venue/regulars/8765'
    ]
  },
  { 
    file: 'scrape-the-ballroom-events.js', 
    name: 'The Ballroom', 
    address: '146 John St, Toronto, ON M5V 2E3',
    attempts: [
      'https://theballroom.ca/',
      'https://www.eventbrite.ca/o/the-ballroom-toronto-32145678901',
      'https://www.showclix.com/venue/the-ballroom-toronto'
    ]
  },
  { 
    file: 'scrape-dive-bar-events.js', 
    name: 'Dive Bar', 
    address: '1631 Dundas St W, Toronto, ON M6K 1V2',
    attempts: [
      'https://www.instagram.com/divebar_to/',
      'https://www.facebook.com/divebarTO/events'
    ]
  },
  { 
    file: 'scrape-trinity-common-events.js', 
    name: 'Trinity Common', 
    address: '60 Atlantic Ave, Toronto, ON M6K 1X9',
    attempts: [
      'https://trinitycommon.ca/',
      'https://www.eventbrite.ca/o/trinity-common-32145678901'
    ]
  },
  { 
    file: 'scrape-bottega-eventi-events.js', 
    name: 'Bottega Eventi', 
    address: '55 Mill St Building 63, Toronto, ON M5A 3C4',
    attempts: [
      'https://www.bottegaeventi.com/',
      'https://www.eventbrite.ca/o/bottega-eventi-32145678901'
    ]
  }
];

async function testUrl(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (response.status === 200) {
      const contentType = response.headers['content-type'] || '';
      const hasHtml = contentType.includes('text/html') || response.data.includes('<html');
      return { 
        status: 'success', 
        code: 200, 
        html: hasHtml,
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

async function researchVenues() {
  console.log('🔍 Researching working URLs for 10 nightlife venues...\n');
  
  const results = [];
  
  for (const venue of venueResearch) {
    console.log(`📍 ${venue.name}`);
    let bestUrl = null;
    
    for (const url of venue.attempts) {
      const result = await testUrl(url);
      console.log(`   ${url.substring(0, 50)}... - ${result.status === 'success' ? '✅' : '❌'} ${result.code || result.error}`);
      
      if (result.status === 'success' && result.html && !bestUrl) {
        bestUrl = url;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (bestUrl) {
      console.log(`   🎯 Best URL: ${bestUrl}\n`);
      results.push({ ...venue, workingUrl: bestUrl, method: bestUrl.includes('ra.co') ? 'puppeteer' : 'axios' });
    } else {
      console.log(`   ⚠️  No working URL found\n`);
      results.push({ ...venue, workingUrl: null, method: null });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESEARCH SUMMARY');
  console.log('='.repeat(60));
  
  const withUrls = results.filter(r => r.workingUrl);
  const withoutUrls = results.filter(r => !r.workingUrl);
  
  console.log(`\n✅ Found working URLs: ${withUrls.length}/10`);
  withUrls.forEach(r => {
    console.log(`   ${r.name} → ${r.workingUrl}`);
    console.log(`      Method: ${r.method}`);
  });
  
  console.log(`\n❌ No working URLs: ${withoutUrls.length}/10`);
  withoutUrls.forEach(r => {
    console.log(`   ${r.name} - venue may use Instagram/Facebook only`);
  });
  
  // Save results
  fs.writeFileSync('NIGHTLIFE_URL_RESEARCH.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to NIGHTLIFE_URL_RESEARCH.json');
  
  return results;
}

researchVenues().catch(console.error);
