const fs = require('fs');
const path = require('path');

const TORONTO_DIR = './scrapers/cities/Toronto';

// Simple working scraper template
const SIMPLE_TEMPLATE = `const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

async function scrapeEvents() {
  console.log('🔍 Scraping events from VENUE_NAME...');
  
  try {
    const response = await axios.get('BASE_URL', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    
    $('h1, h2, h3').each((i, element) => {
      if (i >= 5) return false; // Limit to 5 events for testing
      
      const title = $(element).text().trim();
      if (title && title.length > 5) {
        const event = {
          id: generateEventId(title, 'VENUE_NAME', new Date()),
          title: title,
          url: 'BASE_URL',
          sourceUrl: 'BASE_URL',
          description: title,
          startDate: new Date(),
          endDate: new Date(),
          venue: 'VENUE_NAME',
          price: 'Contact venue',
          categories: ['Events'],
          source: 'VENUE_NAME-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['toronto'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        events.push(event);
      }
    });
    
    console.log(\`Found \${events.length} events from VENUE_NAME\`);
    return events;
    
  } catch (error) {
    console.error('Error scraping VENUE_NAME:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
`;

function createSimpleTorontoScrapers() {
  console.log('🔧 Creating simple working Toronto scrapers...');
  
  const venues = [
    { file: 'scrape-cn-tower-simple.js', name: 'CN Tower', url: 'https://www.cntower.ca' },
    { file: 'scrape-rom-simple.js', name: 'Royal Ontario Museum', url: 'https://www.rom.on.ca' },
    { file: 'scrape-ago-simple.js', name: 'Art Gallery of Ontario', url: 'https://ago.ca' }
  ];
  
  let createdCount = 0;
  
  for (const venue of venues) {
    const filePath = path.join(TORONTO_DIR, venue.file);
    
    try {
      const content = SIMPLE_TEMPLATE
        .replace(/VENUE_NAME/g, venue.name)
        .replace(/BASE_URL/g, venue.url);
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Created: ${venue.file}`);
      createdCount++;
      
    } catch (error) {
      console.log(`❌ Error creating ${venue.file}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 SIMPLE SCRAPER CREATION SUMMARY:`);
  console.log(`✅ Created: ${createdCount}`);
}

createSimpleTorontoScrapers();
