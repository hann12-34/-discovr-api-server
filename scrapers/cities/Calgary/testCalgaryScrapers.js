/**
 * Calgary Venue Scrapers Integration Test
 * Tests all Calgary venue scrapers and generates performance report
 */

const fs = require('fs');
const path = require('path');

// Import all Calgary scrapers
const saddledome = require('./saddledome');
const artsCommons = require('./artsCommons');
const stampedePark = require('./stampedePark');
const macEwanHall = require('./macEwanHall');

const scrapers = [
  { name: 'Scotiabank Saddledome', scraper: saddledome },
  { name: 'Arts Commons', scraper: artsCommons },
  { name: 'Calgary Stampede Park', scraper: stampedePark },
  { name: 'MacEwan Hall', scraper: macEwanHall }
];

async function testAllCalgaryScrapers() {
  console.log('🧪 CALGARY VENUE SCRAPERS INTEGRATION TEST');
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
      const events = await scraper.scrape('Calgary');
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
  console.log('📊 CALGARY SCRAPERS TEST SUMMARY');
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
    city: 'Calgary',
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

  const reportPath = path.join(__dirname, 'Calgary_scrapers_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Performance evaluation
  console.log('\n🎯 PERFORMANCE EVALUATION:');
  if (workingScrapers >= 3 && totalEvents >= 50) {
    console.log('🌟 EXCELLENT: Strong Calgary event coverage with multiple working scrapers');
  } else if (workingScrapers >= 2 && totalEvents >= 25) {
    console.log('✅ GOOD: Solid Calgary event extraction foundation');
  } else if (workingScrapers >= 1 && totalEvents >= 5) {
    console.log('⚠️  BASIC: Limited but functional Calgary coverage');
  } else {
    console.log('❌ NEEDS WORK: Calgary scrapers require significant improvements or URL updates');
  }

  // Show working scrapers
  if (workingScrapers > 0) {
    console.log('\n🏆 TOP PERFORMING CALGARY SCRAPERS:');
    results
      .filter(r => r.status === 'working')
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 5)
      .forEach((result, i) => {
        console.log(`${i + 1}. ${result.venue}: ${result.eventCount} events`);
      });
  }

  return {
    totalEvents,
    workingScrapers,
    results,
    allEvents: allEvents.slice(0, 20)
  };
}

// Run the test
if (require.main === module) {
  testAllCalgaryScrapers()
    .then(results => {
      console.log('\n✨ Calgary scrapers integration test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllCalgaryScrapers };
