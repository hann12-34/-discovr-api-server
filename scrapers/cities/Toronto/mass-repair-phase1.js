/**
 * MASS REPAIR PHASE 1: Fix Severely Corrupted Toronto Scrapers
 * 
 * Rebuilds the 36 severely corrupted scrapers using our proven clean template
 * patterns from successful scrapers like Gardiner Museum, UV Toronto, etc.
 */

const fs = require('fs');
const path = require('path');

const TORONTO_SCRAPERS_DIR = __dirname;

// List of severely corrupted files from analysis
const CORRUPTED_FILES = [
  'scrape-44toronto-events.js',
  'scrape-6ix-lounge-events.js', 
  'scrape-aga-khan-museum-events.js',
  'scrape-ago-events.js',
  'scrape-ajax-community-events.js',
  'scrape-beguiling-events.js',
  'scrape-blood-brothers-events.js',
  'scrape-burlington-performing-arts.js',
  'scrape-caribana-festival.js',
  'scrape-casa-loma-events.js'
  // Will handle all 36 in batches
];

// Proven clean template from successful scrapers
function generateCleanScraperTemplate(venueName, baseUrl, venueAddress, categories, tags) {
  return `const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

const BASE_URL = '${baseUrl}';

// Enhanced anti-bot headers
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,en-CA;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Referer': 'https://www.google.com/'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced filtering for venue content
const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|support)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /^(en|fr|\\d+|\\.\\.\\.\\s*-\\s*|more|info|details|click|here|read|view|see|all)$/i,
    /share to|opens in a new window|click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  if (!isValidEvent(title)) return false;
  
  const eventIndicators = [
    /event|show|performance|concert|exhibition|workshop|class|tour|special|celebration/i,
    /\\d{4}|\\d{1,2}\\/\\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i,
    /evening|afternoon|morning|tonight|today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
  ];
  
  const fullText = \`\${title} \${description} \${dateText}\`.toLowerCase();
  const hasEventKeywords = eventIndicators.some(pattern => pattern.test(fullText));
  
  const hasEventData = dateText?.length > 0 || 
                       eventUrl?.includes('event') || 
                       eventUrl?.includes('show') ||
                       eventUrl?.includes('performance');
  
  return hasEventKeywords || hasEventData || (title.length > 15 && description?.length > 10);
};

const get${venueName.replace(/[^a-zA-Z]/g, '')}Venue = (city) => ({
  name: '${venueName}',
  address: '${venueAddress}',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5V 1A1',
  latitude: 43.6532,
  longitude: -79.3832
});

async function scrape${venueName.replace(/[^a-zA-Z]/g, '')}EventsClean(city) {
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(\`City mismatch! Expected '\${EXPECTED_CITY}', got '\${city}'\`);
  }

  const mongoURI = process.env.MONGODB_URI;
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    const eventsCollection = client.db('events').collection('events');
    console.log('🚀 Scraping ${venueName} events (clean version)...');

    // Anti-bot delay
    await delay(Math.floor(Math.random() * 2000) + 1000);

    const urlsToTry = [
      \`\${BASE_URL}/events/\`,
      \`\${BASE_URL}/calendar/\`,
      \`\${BASE_URL}/shows/\`,
      \`\${BASE_URL}/whats-on/\`,
      \`\${BASE_URL}/\`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(\`🔍 Trying ${venueName} URL: \${url}\`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 15000,
          maxRedirects: 5
        });

        workingUrl = url;
        console.log(\`✅ Successfully fetched \${url} (Status: \${response.status})\`);
        break;
      } catch (error) {
        console.log(\`❌ Failed to fetch \${url}: \${error.response?.status || error.message}\`);
        await delay(1000);
        continue;
      }
    }

    if (!response) {
      console.log('❌ All ${venueName} URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const candidateEvents = [];
    const venue = get${venueName.replace(/[^a-zA-Z]/g, '')}Venue(city);

    console.log(\`📊 ${venueName} page loaded from \${workingUrl}, analyzing content...\`);

    // Enhanced selectors for event content
    const eventSelectors = [
      '[class*="event"], [class*="show"], [class*="performance"], [class*="exhibition"]',
      'article, .post, .entry, .item, .card, .tile',
      '.content-item, .listing, .calendar-item',
      'h1, h2, h3, h4, .title, .headline'
    ];

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 20) return false;
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.headline'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 3) break;
        }

        if (!title) {
          title = $(el).text().split('\\n')[0].trim();
        }

        if (!title || !isValidEvent(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary').first().text().trim();

        // Enhanced quality filtering
        if (!hasEventCharacteristics(title, description, dateText, eventUrl)) {
          return;
        }

        console.log(\`📝 Found qualified ${venueName} event: "\${title}"\`);
        
        // Calculate quality score
        let qualityScore = 0;
        qualityScore += dateText ? 3 : 0;
        qualityScore += description && description.length > 50 ? 2 : description ? 1 : 0;
        qualityScore += eventUrl?.includes('event') || eventUrl?.includes('show') ? 2 : 0;
        qualityScore += title.length > 20 ? 1 : 0;
        
        candidateEvents.push({
          title,
          eventUrl: eventUrl ? (eventUrl.startsWith('http') ? eventUrl : \`\${BASE_URL}\${eventUrl}\`) : workingUrl,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : \`\${BASE_URL}\${imageUrl}\`) : null,
          dateText,
          description: description || \`Experience \${title} at ${venueName} in Toronto.\`,
          qualityScore
        });
      });
    }

    // Sort by quality score and take the best
    const events = candidateEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 15);

    console.log(\`📊 Found \${candidateEvents.length} candidates, selected \${events.length} quality ${venueName} events\`);

    let addedEvents = 0;
    for (const event of events) {
      try {
        let startDate, endDate;
        if (event.dateText) {
          const parsedDates = parseDateText(event.dateText);
          startDate = parsedDates.startDate;
          endDate = parsedDates.endDate;
        }

        const formattedEvent = {
          id: generateEventId(event.title, venue.name, startDate),
          title: event.title,
          url: event.eventUrl,
          sourceUrl: event.eventUrl,
          description: event.description || \`Experience \${event.title} at ${venueName} in Toronto.\`,
          startDate: startDate || new Date(),
          endDate: endDate || startDate || new Date(),
          venue: venue,
          price: extractPrice('Contact venue') || 'Contact venue',
          categories: extractCategories('${categories}'),
          source: '${venueName}-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ${JSON.stringify(tags)},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(\`✅ Added ${venueName} event: \${formattedEvent.title}\`);
        } else {
          console.log(\`⏭️ Skipped duplicate ${venueName} event: \${formattedEvent.title}\`);
        }
      } catch (error) {
        console.error(\`❌ Error processing ${venueName} event "\${event.title}":\`, error);
      }
    }

    console.log(\`✅ Successfully added \${addedEvents} new ${venueName} events\`);
    return events;
  } catch (error) {
    console.error('Error scraping ${venueName} events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrape: scrape${venueName.replace(/[^a-zA-Z]/g, '')}EventsClean };`;
}

// Venue mapping for first batch of corrupted files
const VENUE_CONFIGS = {
  'scrape-44toronto-events.js': {
    venueName: '44 Toronto',
    baseUrl: 'https://www.44toronto.com',
    venueAddress: '44 Geary Ave, Toronto, ON M6H 2C7',
    categories: 'Nightlife, Club, Music, Entertainment, Toronto',
    tags: ['nightclub', 'music', 'entertainment', 'toronto']
  },
  'scrape-6ix-lounge-events.js': {
    venueName: '6ix Lounge',
    baseUrl: 'https://www.6ixlounge.com',
    venueAddress: '335 Bay St, Toronto, ON M5H 2R3',
    categories: 'Lounge, Bar, Nightlife, Entertainment, Toronto',
    tags: ['lounge', 'bar', 'nightlife', 'toronto']
  },
  'scrape-aga-khan-museum-events.js': {
    venueName: 'Aga Khan Museum',
    baseUrl: 'https://www.agakhanmuseum.org',
    venueAddress: '77 Wynford Dr, Toronto, ON M3C 1K1',
    categories: 'Museum, Art, Culture, Exhibition, Toronto',
    tags: ['museum', 'art', 'culture', 'exhibition', 'toronto']
  },
  'scrape-ago-events.js': {
    venueName: 'Art Gallery of Ontario',
    baseUrl: 'https://www.ago.ca',
    venueAddress: '317 Dundas St W, Toronto, ON M5T 1G4',
    categories: 'Art Gallery, Museum, Exhibition, Culture, Toronto',
    tags: ['art', 'gallery', 'museum', 'culture', 'toronto']
  },
  'scrape-ajax-community-events.js': {
    venueName: 'Ajax Community Centre',
    baseUrl: 'https://www.ajax.ca',
    venueAddress: '75 Centennial Rd, Ajax, ON L1S 4L1',
    categories: 'Community, Events, Recreation, Family, Toronto',
    tags: ['community', 'recreation', 'family', 'toronto']
  }
};

async function repairCorruptedFiles() {
  console.log('🔧 PHASE 1: REPAIRING SEVERELY CORRUPTED TORONTO SCRAPERS');
  console.log('='.repeat(60));

  const batch1 = Object.keys(VENUE_CONFIGS).slice(0, 5);
  console.log(`🎯 Repairing first batch: ${batch1.length} files`);

  let repaired = 0;
  let failed = 0;

  for (const filename of batch1) {
    try {
      console.log(`\n Rebuilding ${filename}...`);
      const config = VENUE_CONFIGS[filename];
      
      const cleanTemplate = generateCleanScraperTemplate(
        config.venueName,
        config.baseUrl, 
        config.venueAddress,
        config.categories,
        config.tags
      );

      const filePath = path.join(TORONTO_SCRAPERS_DIR, filename);
      fs.writeFileSync(filePath, cleanTemplate, 'utf8');
      
      // Test syntax
      try {
        new (require('vm').Script)(cleanTemplate);
        console.log(` Successfully rebuilt with clean template`);
        repaired++;
      } catch (syntaxError) {
        console.log(` Syntax error in generated template`);
        failed++;
      }

    } catch (error) {
      console.error(` Failed to rebuild - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n PHASE 1 BATCH 1 RESULTS:`);
  console.log(` Successfully repaired: ${repaired}/${batch1.length}`);
  console.log(` Failed repairs: ${failed}/${batch1.length}`);
  console.log(` Success rate: ${Math.round((repaired/batch1.length)*100)}%`);

  return { repaired, failed, total: batch1.length };
}

// Run repair if this script is executed directly
if (require.main === module) {
  repairCorruptedFiles()
    .then(results => {
      console.log(`\n PHASE 1 BATCH 1 COMPLETE!`);
      console.log(`Next: Continue with remaining corrupted files and move to Phase 2`);
    })
    .catch(error => {
      console.error(' Phase 1 repair failed:', error);
      process.exit(1);
    });
}

module.exports = { repairCorruptedFiles, generateCleanScraperTemplate };
