const axios = require('axios');
const cheerio = require('cheerio');

// Research actual working event URLs for Calgary venues
const calgaryVenueResearch = [
  // Current scrapers that return 0 events
  {
    name: 'Arts Commons',
    file: 'scrape-arts-commons.js',
    attempts: [
      'https://arts-commons.com/events',
      'https://arts-commons.com/whats-on',
      'https://www.showpass.com/o/arts-commons/'
    ]
  },
  {
    name: 'Calgary Stampede',
    file: 'scrape-calgary-stampede.js',
    attempts: [
      'https://www.calgarystampede.com/events',
      'https://www.calgarystampede.com/stampede',
      'https://www.showpass.com/o/calgary-stampede/'
    ]
  },
  {
    name: 'Saddledome (Scotiabank Saddledome)',
    file: 'scrape-saddledome.js',
    attempts: [
      'https://www.scotiabanksaddledome.com/events',
      'https://www.ticketmaster.ca/scotiabank-saddledome-tickets-calgary/venue/211106',
      'https://www.nhl.com/flames/schedule'
    ]
  },
  {
    name: 'Commonwealth Bar & Stage',
    file: 'scrape-commonwealth-bar-stage.js',
    attempts: [
      'https://www.thecommonwealth.ca/events',
      'https://www.ticketweb.ca/venue/commonwealth-bar-stage-calgary-ab/3152',
      'https://www.showclix.com/venue/commonwealth-bar-stage'
    ]
  },
  {
    name: 'Calgary Philharmonic',
    file: 'scrape-calgary-philharmonic.js',
    attempts: [
      'https://calgaryphil.com/events',
      'https://calgaryphil.com/concerts-and-tickets',
      'https://www.showpass.com/o/calgary-philharmonic-orchestra/'
    ]
  },
  {
    name: 'National Music Centre',
    file: 'scrape-national-music-centre.js',
    attempts: [
      'https://www.nmc.ca/events/',
      'https://www.nmc.ca/whats-on/',
      'https://www.showpass.com/o/national-music-centre/'
    ]
  },
  {
    name: 'Telus Spark',
    file: 'scrape-telus-spark.js',
    attempts: [
      'https://www.sparkscience.ca/events/',
      'https://www.sparkscience.ca/visit/',
      'https://www.showpass.com/o/telus-spark/'
    ]
  },
  {
    name: 'Glenbow Museum',
    file: 'scrape-glenbow-museum.js',
    attempts: [
      'https://www.glenbow.org/events/',
      'https://www.glenbow.org/visit/',
      'https://www.eventbrite.ca/o/glenbow-museum-8347856273'
    ]
  },
  {
    name: 'Studio Bell',
    file: 'scrape-studio-bell.js',
    attempts: [
      'https://www.nmc.ca/studio-bell/',
      'https://www.nmc.ca/events/',
      'https://www.showpass.com/o/studio-bell/'
    ]
  },
  {
    name: 'University of Calgary',
    file: 'scrape-university-of-calgary.js',
    attempts: [
      'https://www.ucalgary.ca/events',
      'https://calendar.ucalgary.ca/',
      'https://www.eventbrite.ca/o/university-of-calgary-8347856273'
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      const hasEvents = $('[class*="event"], .show, .concert, .performance, article').length > 0;
      const hasEventKeywords = response.data.toLowerCase().includes('event') || 
                               response.data.toLowerCase().includes('show') ||
                               response.data.toLowerCase().includes('concert');
      
      return { 
        status: 'success', 
        code: 200,
        hasEvents: hasEvents,
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

async function researchCalgaryVenues() {
  console.log('🔍 Researching working URLs for Calgary venues...\n');
  
  const results = [];
  
  for (const venue of calgaryVenueResearch) {
    console.log(`📍 ${venue.name}`);
    let bestUrl = null;
    let bestScore = 0;
    
    for (const url of venue.attempts) {
      const result = await testUrl(url);
      const score = result.hasEvents ? 2 : (result.hasKeywords ? 1 : 0);
      
      console.log(`   ${url.substring(0, 50)}... - ${result.status === 'success' ? '✅' : '❌'} ${result.code || result.error}${result.hasEvents ? ' [HAS EVENTS]' : ''}${result.hasKeywords ? ' [HAS KEYWORDS]' : ''}`);
      
      if (result.status === 'success' && score > bestScore) {
        bestUrl = url;
        bestScore = score;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (bestUrl) {
      console.log(`   🎯 Best URL: ${bestUrl} (score: ${bestScore})\n`);
      results.push({ ...venue, workingUrl: bestUrl, score: bestScore });
    } else {
      console.log(`   ⚠️  No working URL found\n`);
      results.push({ ...venue, workingUrl: null, score: 0 });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 CALGARY RESEARCH SUMMARY');
  console.log('='.repeat(60));
  
  const withUrls = results.filter(r => r.workingUrl);
  const withEvents = results.filter(r => r.score === 2);
  const withKeywords = results.filter(r => r.score === 1);
  const withoutUrls = results.filter(r => !r.workingUrl);
  
  console.log(`\n✅ Found working URLs: ${withUrls.length}/${calgaryVenueResearch.length}`);
  console.log(`   🎉 With event elements: ${withEvents.length}`);
  console.log(`   📝 With event keywords: ${withKeywords.length}`);
  
  if (withUrls.length > 0) {
    console.log('\n📋 Working URLs:');
    withUrls.forEach(r => {
      console.log(`   ${r.name} → ${r.workingUrl}`);
    });
  }
  
  if (withoutUrls.length > 0) {
    console.log(`\n❌ No working URLs: ${withoutUrls.length}`);
    withoutUrls.forEach(r => {
      console.log(`   ${r.name}`);
    });
  }
  
  const fs = require('fs');
  fs.writeFileSync('CALGARY_URL_RESEARCH.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to CALGARY_URL_RESEARCH.json');
  
  return results;
}

researchCalgaryVenues().catch(console.error);
