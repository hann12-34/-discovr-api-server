# Event Scraper Architecture Guide

## 🏗️ System Architecture Overview

This document provides a comprehensive guide for implementing event scrapers across multiple cities, based on our successful deployment across Vancouver, Montreal, Toronto, and Calgary.

---

## 📁 Directory Structure

```
scrapers/
├── MULTI_CITY_PERFORMANCE_SUMMARY.md
├── SCRAPER_ARCHITECTURE_GUIDE.md
└── cities/
    ├── Vancouver/
    │   ├── testAllScrapers.js          # Integration test runner
    │   ├── foxCabaret.js               # Individual venue scrapers
    │   ├── fortuneSoundClub.js
    │   ├── commodoreBallroom.js
    │   └── [24+ venue scrapers]
    ├── Toronto/
    │   ├── testTorontoScrapers.js      # Integration test runner
    │   ├── scotiabank.js               # Individual venue scrapers
    │   ├── phoenixConcertTheatre.js
    │   └── [6+ venue scrapers]
    ├── Montreal/
    │   ├── testMontrealScrapers.js     # Integration test runner
    │   ├── bellCentre.js               # Individual venue scrapers  
    │   ├── placesDesArts.js
    │   └── [7+ venue scrapers]
    └── Calgary/
        ├── testCalgaryScrapers.js      # Integration test runner
        └── [4+ venue scrapers]
```

---

## 🔧 Core Scraper Template

### Basic Scraper Structure

```javascript
/**
 * [Venue Name] Events Scraper ([City])
 * Scrapes upcoming events from [Venue Name]
 * [Brief venue description]
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const VenueNameEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from [Venue Name] ([City])...');

    try {
      const response = await axios.get('[VENUE_URL]', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Multiple selectors for different event layouts
      const eventSelectors = [
        '.event-item',
        '.event-card',
        '.event-listing',
        'article.event',
        '.upcoming-event',
        '.show-item',
        '.card',
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/show"]',
        '.post',
        '.listing'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            // Extract event title
            let title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .card-title, .post-title, .show-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = '[BASE_URL]' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'tickets', 'buy'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // Extract date information
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, time, .datetime, .when').first().text().trim();
            if (dateText) {
              eventDate = dateText;
            }

            console.log(`✓ Event: ${title}`);

            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              time: null,
              url: url,
              venue: '[VENUE_NAME]',
              location: '[CITY], [PROVINCE]',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from [Venue Name]`);
      return events;

    } catch (error) {
      console.error('Error scraping [Venue Name] events:', error.message);
      return [];
    }
  }
};

module.exports = VenueNameEvents;
```

---

## 🧪 Integration Test Template

### City-Wide Test Runner

```javascript
/**
 * [City] Venue Scrapers Integration Test
 * Tests all [City] venue scrapers and generates performance report
 */

const fs = require('fs');
const path = require('path');

// Import all [City] scrapers
const venue1 = require('./venue1');
const venue2 = require('./venue2');
// ... add all venues

const scrapers = [
  { name: 'Venue 1', scraper: venue1 },
  { name: 'Venue 2', scraper: venue2 },
  // ... add all venues
];

async function testAll[City]Scrapers() {
  console.log('🧪 [CITY] VENUE SCRAPERS INTEGRATION TEST');
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
      const events = await scraper.scrape('[City]');
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
  console.log('📊 [CITY] SCRAPERS TEST SUMMARY');
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
    city: '[City]',
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

  const reportPath = path.join(__dirname, '[City]_scrapers_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Performance evaluation
  console.log('\n🎯 PERFORMANCE EVALUATION:');
  if (workingScrapers >= 4 && totalEvents >= 100) {
    console.log('🌟 EXCELLENT: Strong [City] event coverage with multiple working scrapers');
  } else if (workingScrapers >= 2 && totalEvents >= 50) {
    console.log('✅ GOOD: Solid [City] event extraction foundation');
  } else if (workingScrapers >= 1 && totalEvents >= 10) {
    console.log('⚠️  BASIC: Limited but functional [City] coverage');
  } else {
    console.log('❌ NEEDS WORK: [City] scrapers require significant improvements');
  }

  // Show working scrapers
  if (workingScrapers > 0) {
    console.log('\n🏆 TOP PERFORMING [CITY] SCRAPERS:');
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
  testAll[City]Scrapers()
    .then(results => {
      console.log('\n✨ [City] scrapers integration test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAll[City]Scrapers };
```

---

## 🎯 Implementation Best Practices

### 1. **Zero Fake Events Policy**
- **Never** generate, fallback to, or accept fake events
- Implement aggressive filtering for sample/placeholder content
- Use real venue websites only
- Filter out navigation, promotional, and social media links

### 2. **Multi-Selector Strategy**
```javascript
const eventSelectors = [
  '.event-item',           // Common event wrapper
  '.event-card',           // Card-based layouts
  'article.event',         // Semantic HTML
  'a[href*="/event"]',     // Event URL patterns
  'a[href*="/show"]',      // Show/performance URLs
  '.upcoming-event',       // Upcoming events sections
  '.card',                 # Generic cards
  '.post'                  // Blog-style posts
];
```

### 3. **Robust Error Handling**
```javascript
try {
  const response = await axios.get(url, {
    timeout: 30000,  // 30 second timeout
    headers: { /* realistic browser headers */ }
  });
  // ... scraping logic
} catch (error) {
  console.error(`Error scraping ${venueName}:`, error.message);
  return [];  // Always return empty array, never throw
}
```

### 4. **Comprehensive Deduplication**
```javascript
const seenUrls = new Set();

// Check for duplicates
if (!title || title.length < 3 || seenUrls.has(url)) {
  return; // Skip duplicate or invalid events
}

seenUrls.add(url);
```

### 5. **Smart Content Filtering**
```javascript
const skipTerms = [
  'menu', 'contact', 'about', 'home', 'calendar',
  'facebook', 'instagram', 'twitter', 'linkedin',
  'read more', 'view all', 'tickets', 'buy', 'shop',
  'subscribe', 'newsletter', 'privacy', 'terms'
];

if (skipTerms.some(term => 
  title.toLowerCase().includes(term) || 
  url.toLowerCase().includes(term)
)) {
  return; // Skip non-event content
}
```

---

## 🌐 Anti-Bot Evasion

### HTTP Headers Configuration
```javascript
headers: {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
}
```

### Request Timing
- Use reasonable timeouts (30 seconds)
- Implement delays between requests if needed
- Respect robots.txt when possible
- Monitor for rate limiting responses

---

## 📊 Quality Assurance

### Event Data Structure
```javascript
{
  id: uuidv4(),                    // Unique identifier
  title: 'Event Title',           // Clean, descriptade title
  date: 'March 15, 2024',         // Human-readable date
  time: '7:30 PM',                // Event time if available
  url: 'https://venue.com/event', // Direct event URL
  venue: 'Venue Name',            // Consistent venue naming
  location: 'City, Province',     // Standard location format
  description: null,              // Extended description if available
  image: null                     // Event image URL if available
}
```

### Validation Checks
1. **Title Length**: Minimum 3 characters
2. **URL Validity**: Must be proper HTTP/HTTPS URL
3. **No Duplicates**: Check against existing URLs
4. **Real Content**: No fake, sample, or placeholder events
5. **Venue Consistency**: Consistent venue naming across scrapers

---

## 🚀 City Expansion Workflow

### Phase 1: Research & Planning
1. **Venue Identification**
   - Research major venues in target city
   - Prioritize established venues with active websites
   - Focus on diverse event types (music, theater, sports, culture)

2. **Technical Assessment**
   - Check website structure (static HTML vs. JavaScript-rendered)
   - Identify potential anti-bot protections
   - Assess event listing patterns and URL structures

### Phase 2: Scraper Development
1. **Create City Directory**
   ```bash
   mkdir scrapers/cities/NewCity
   ```

2. **Develop Individual Scrapers**
   - Start with 3-5 major venues
   - Use standard scraper template
   - Implement venue-specific selectors

3. **Build Integration Test**
   - Create city-specific test runner
   - Include all developed scrapers
   - Generate performance reports

### Phase 3: Testing & Validation
1. **Individual Scraper Testing**
   - Test each scraper independently
   - Verify event extraction quality
   - Check for fake/sample event filtering

2. **Integration Testing**
   - Run full city test suite
   - Analyze success rates and event counts
   - Document any failures or limitations

3. **Performance Assessment**
   - Evaluate against success metrics
   - Compare with existing cities
   - Plan improvements and expansions

### Phase 4: Deployment & Monitoring
1. **Documentation Updates**
   - Update performance summary
   - Document new city specifics
   - Update architecture guide as needed

2. **Ongoing Maintenance**
   - Regular testing for broken scrapers
   - URL updates and venue changes
   - Performance monitoring and optimization

---

## 🔍 Troubleshooting Guide

### Common Issues

#### 1. **No Events Found (0 results)**
```
Possible Causes:
- Website structure changed
- Anti-bot protection blocking requests
- JavaScript-rendered content (requires Puppeteer)
- Incorrect selectors or URL patterns

Solutions:
- Inspect website HTML structure
- Update CSS selectors
- Implement headless browser scraping
- Verify URL accessibility
```

#### 2. **403/404 Errors**
```
Possible Causes:
- URL changed or venue website moved
- Bot detection blocking requests
- Rate limiting or IP blocking

Solutions:
- Research new venue URLs
- Update request headers
- Implement request delays
- Consider proxy usage
```

#### 3. **Fake/Sample Events Detected**
```
Possible Causes:
- Website showing placeholder content
- Recurring sample events
- Test data in production

Solutions:
- Strengthen content filtering
- Add venue-specific skip terms
- Implement date validation
- Manual content review
```

#### 4. **High Duplicate Ratios**
```
Possible Causes:
- Events appearing on multiple pages
- Similar event titles with different URLs
- Cross-venue event listings

Solutions:
- Improve deduplication logic
- Normalize event titles
- Use URL-based deduplication
- Filter cross-venue duplicates
```

---

## 📈 Performance Metrics

### Success Rate Targets
- **Excellent**: 70%+ scraper success rate, 100+ events
- **Good**: 50%+ scraper success rate, 50+ events  
- **Basic**: 30%+ scraper success rate, 20+ events
- **Needs Work**: <30% success rate or <20 events

### Event Quality Standards
- **Zero Fake Events**: 100% real event requirement
- **Duplicate Ratio**: <30% preferred
- **Content Quality**: Meaningful titles and descriptions
- **URL Validity**: All event URLs must be accessible

### Monitoring Schedule
- **Daily**: Automated health checks
- **Weekly**: Full integration test runs
- **Monthly**: Performance analysis and reporting
- **Quarterly**: Expansion planning and architecture review

---

## 🛠️ Advanced Features

### Puppeteer Integration (For JS-Heavy Sites)
```javascript
const puppeteer = require('puppeteer');

async function scrapeWithPuppeteer(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  const content = await page.content();
  
  await browser.close();
  return content;
}
```

### Proxy Support (For Anti-Bot Evasion)
```javascript
const response = await axios.get(url, {
  proxy: {
    host: 'proxy-server.com',
    port: 8080,
    auth: { username: 'user', password: 'pass' }
  },
  // ... other options
});
```

### Machine Learning Content Extraction
```javascript
// Future enhancement: Use ML to identify event content
// even when CSS selectors change or fail
const eventContent = await mlExtractor.extractEvents(htmlContent);
```

---

## 📚 Dependencies

### Required Packages
```json
{
  "axios": "^1.0.0",      // HTTP client
  "cheerio": "^1.0.0",    // HTML parsing
  "uuid": "^9.0.0"        // Unique ID generation
}
```

### Optional Packages
```json
{
  "puppeteer": "^19.0.0", // Headless browser (for JS sites)
  "proxy-agent": "^6.0.0" // Proxy support
}
```

---

**Last Updated**: September 2025  
**Version**: 2.0  
**Maintained By**: Discovr Event Scraping Team
