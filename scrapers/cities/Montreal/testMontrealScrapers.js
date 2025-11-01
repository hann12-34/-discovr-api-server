/**
 * Montreal Venue Scrapers Integration Test
 * Tests all Montreal venue scrapers and generates performance report
 */

const fs = require('fs');
const path = require('path');

// Import all Montreal scrapers
const bellCentre = require('./bellCentre');
const placeDesArts = require('./placesDesArts');
const theatreStDenis = require('./theatreStDenis');
const metropolis = require('./metropolis');
const mmfa = require('./museeDesFinesArts');
const theatreMaisonneuve = require('./theatreMaisonneuve');
const oldPortMontreal = require('./oldPortMontreal');

const scrapers = [
  { name: 'Bell Centre', scraper: bellCentre },
  { name: 'Place des Arts', scraper: placeDesArts },
  { name: 'Theatre St-Denis', scraper: theatreStDenis },
  { name: 'Metropolis', scraper: metropolis },
  { name: 'Montreal Museum of Fine Arts', scraper: mmfa },
  { name: 'Theatre Maisonneuve', scraper: theatreMaisonneuve },
  { name: 'Old Port Montreal', scraper: oldPortMontreal }
];

async function testAllMontrealScrapers() {
  console.log('🧪 MONTREAL VENUE SCRAPERS INTEGRATION TEST');
  console.log('='.repeat(50));

  const results = [];
  const allEvents = [];
  const seenEventUrls = new Set();
  let totalEvents = 0;
  let workingScrapers = 0;
  let failedScrapers = 0;

  for (const { name, scraper } of scrapers) {
    console.log(`\n📍 Testing ${name}...`);
    
    try {
      const events = await scraper.scrape('Montreal');
      const eventCount = events.length;
      
      if (eventCount > 0) {
        workingScrapers++;
        console.log(`✅ ${name}: ${eventCount} events found`);
        
        // Add unique events to master list
        let uniqueEvents = 0;
        events.forEach(event => {
          if (!seenEventUrls.has(event.url)) {
            seenEventUrls.add(event.url);
            allEvents.push(event);
            uniqueEvents++;
          }
        });
        
        totalEvents += uniqueEvents;
        
        // Show sample events
        const sampleEvents = events.slice(0, 3);
        sampleEvents.forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.title}`);
        });
        
        results.push({
          venue: name,
          status: 'working',
          eventCount: eventCount,
          uniqueEvents: uniqueEvents,
          sampleTitle: events[0]?.title || 'N/A'
        });
      } else {
        failedScrapers++;
        console.log(`❌ ${name}: No events found`);
        results.push({
          venue: name,
          status: 'no_events',
          eventCount: 0,
          uniqueEvents: 0,
          sampleTitle: 'N/A'
        });
      }
    } catch (error) {
      failedScrapers++;
      console.log(`💥 ${name}: Error - ${error.message}`);
      results.push({
        venue: name,
        status: 'error',
        eventCount: 0,
        uniqueEvents: 0,
        error: error.message,
        sampleTitle: 'N/A'
      });
    }
  }

  // Calculate duplicate ratio
  const totalRawEvents = results.reduce((sum, result) => sum + result.eventCount, 0);
  const duplicateRatio = totalRawEvents > 0 ? ((totalRawEvents - totalEvents) / totalRawEvents * 100).toFixed(1) : 0;

  console.log('\n' + '='.repeat(50));
  console.log('📊 MONTREAL SCRAPERS TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total scrapers tested: ${scrapers.length}`);
  console.log(`Working scrapers: ${workingScrapers}`);
  console.log(`Failed scrapers: ${failedScrapers}`);
  console.log(`Success rate: ${((workingScrapers / scrapers.length) * 100).toFixed(1)}%`);
  console.log(`Total unique events: ${totalEvents}`);
  console.log(`Total raw events: ${totalRawEvents}`);
  console.log(`Duplicate ratio: ${duplicateRatio}%`);

  // Save detailed results
  const reportData = {
    testDate: new Date().toISOString(),
    city: 'Montreal',
    summary: {
      totalScrapers: scrapers.length,
      workingScrapers,
      failedScrapers,
      successRate: ((workingScrapers / scrapers.length) * 100).toFixed(1) + '%',
      totalUniqueEvents: totalEvents,
      totalRawEvents,
      duplicateRatio: duplicateRatio + '%'
    },
    scraperResults: results,
    sampleEvents: allEvents.slice(0, 10).map(event => ({
      title: event.title,
      venue: event.venue,
      date: event.date,
      url: event.url
    }))
  };

  const reportPath = path.join(__dirname, 'Montreal_scrapers_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Performance evaluation
  console.log('\n🎯 PERFORMANCE EVALUATION:');
  if (workingScrapers >= 4 && totalEvents >= 100) {
    console.log('🌟 EXCELLENT: Strong Montreal event coverage with multiple working scrapers');
  } else if (workingScrapers >= 2 && totalEvents >= 50) {
    console.log('✅ GOOD: Solid Montreal event extraction foundation');
  } else if (workingScrapers >= 1 && totalEvents >= 10) {
    console.log('⚠️  BASIC: Limited but functional Montreal coverage');
  } else {
    console.log('❌ NEEDS WORK: Montreal scrapers require significant improvements');
  }

  // Show working scrapers
  console.log('\n🏆 TOP PERFORMING MONTREAL SCRAPERS:');
  results
    .filter(r => r.status === 'working')
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 5)
    .forEach((result, i) => {
      console.log(`${i + 1}. ${result.venue}: ${result.eventCount} events`);
    });

  return {
    totalEvents,
    workingScrapers,
    results,
    allEvents: allEvents.slice(0, 20) // Return sample for verification
  };
}

// Run the test
if (require.main === module) {
  testAllMontrealScrapers()
    .then(results => {
      console.log('\n✨ Montreal scrapers integration test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllMontrealScrapers };
