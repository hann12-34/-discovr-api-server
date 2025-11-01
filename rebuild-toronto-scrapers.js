const fs = require('fs');
const path = require('path');

const TORONTO_DIR = './scrapers/cities/Toronto';

// Working scraper template based on Vancouver patterns
const SCRAPER_TEMPLATE = `const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeEvents() {
  console.log('🔍 Scraping events from {{VENUE_NAME}}...');
  
  try {
    const response = await axios.get('{{BASE_URL}}', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    
    // Basic event extraction - can be customized per venue
    $('article, .event, .post, .entry').each((i, element) => {
      const $el = $(element);
      const title = $el.find('h1, h2, h3, .title, .event-title').first().text().trim();
      const description = $el.find('p, .description, .summary').first().text().trim();
      const link = $el.find('a').first().attr('href');
      
      if (title && title.length > 3) {
        const venue = {
          name: '{{VENUE_NAME}}',
          address: '{{VENUE_ADDRESS}}',
          city: 'Toronto',
          state: 'ON',
          zip: '{{VENUE_ZIP}}',
          latitude: {{VENUE_LAT}},
          longitude: {{VENUE_LNG}}
        };

        const event = {
          id: generateEventId(title, venue.name, new Date()),
          title: title,
          url: link ? (link.startsWith('http') ? link : '{{BASE_URL}}' + link) : '{{BASE_URL}}',
          sourceUrl: '{{BASE_URL}}',
          description: description || '',
          startDate: new Date(),
          endDate: new Date(),
          venue: venue.name, // Store as string for mobile app compatibility
          price: 'Contact venue',
          categories: extractCategories('{{CATEGORIES}}'),
          source: '{{VENUE_NAME}}-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['{{TAGS}}'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        events.push(event);
      }
    });
    
    console.log(\`Found \${events.length} total events from {{VENUE_NAME}}\`);
    return events;
    
  } catch (error) {
    console.error('Error scraping {{VENUE_NAME}}:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
`;

function rebuildTorontoScrapers() {
  console.log('🔧 Rebuilding corrupted Toronto scrapers with clean template...');
  
  const files = fs.readdirSync(TORONTO_DIR).filter(file => 
    file.endsWith('.js') && 
    file.startsWith('scrape-') &&
    !file.includes('backup') &&
    !file.includes('working') &&
    !file.includes('test') &&
    !file.includes('fix-') &&
    !file.includes('mass-repair') &&
    !file.includes('template') &&
    !file.includes('validate') &&
    !file.includes('simple-')
  );
  
  let rebuiltCount = 0;
  let errorCount = 0;
  
  // Toronto venue data
  const venues = {
    'scrape-cn-tower': { name: 'CN Tower', url: 'https://www.cntower.ca', address: '290 Bremner Blvd, Toronto, ON M5V 3L9', lat: 43.6426, lng: -79.3871, zip: 'M5V 3L9', categories: 'Tourism, Attraction, Events, Toronto', tags: 'tourism,attraction,events,toronto' },
    'scrape-rom': { name: 'Royal Ontario Museum', url: 'https://www.rom.on.ca', address: '100 Queens Park, Toronto, ON M5S 2C6', lat: 43.6677, lng: -79.3948, zip: 'M5S 2C6', categories: 'Museum, Culture, Art, Toronto', tags: 'museum,culture,art,toronto' },
    'scrape-ago': { name: 'Art Gallery of Ontario', url: 'https://ago.ca', address: '317 Dundas St W, Toronto, ON M5T 1G4', lat: 43.6536, lng: -79.3925, zip: 'M5T 1G4', categories: 'Art, Gallery, Culture, Toronto', tags: 'art,gallery,culture,toronto' },
    'scrape-casa-loma': { name: 'Casa Loma', url: 'https://casaloma.ca', address: '1 Austin Terrace, Toronto, ON M5R 1X8', lat: 43.6780, lng: -79.4094, zip: 'M5R 1X8', categories: 'Castle, Tourism, Events, Toronto', tags: 'castle,tourism,events,toronto' },
    'scrape-harbourfront': { name: 'Harbourfront Centre', url: 'https://harbourfrontcentre.com', address: '235 Queens Quay W, Toronto, ON M5J 2G8', lat: 43.6387, lng: -79.3816, zip: 'M5J 2G8', categories: 'Arts, Culture, Festival, Toronto', tags: 'arts,culture,festival,toronto' },
    'scrape-distillery-district': { name: 'Distillery District', url: 'https://www.thedistillerydistrict.com', address: '55 Mill St, Toronto, ON M5A 3C4', lat: 43.6503, lng: -79.3593, zip: 'M5A 3C4', categories: 'Arts, Shopping, Culture, Toronto', tags: 'arts,shopping,culture,toronto' }
  };
  
  for (const file of files.slice(0, 6)) { // Start with first 6 to test
    const filePath = path.join(TORONTO_DIR, file);
    
    try {
      const baseFileName = file.replace('.js', '').replace('-events', '');
      const venueKey = baseFileName;
      const venue = venues[venueKey] || {
        name: baseFileName.replace(/scrape-|-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: 'https://example.com',
        address: '123 Main St, Toronto, ON M5A 1A1',
        lat: 43.6532,
        lng: -79.3832,
        zip: 'M5A 1A1',
        categories: 'Events, Toronto',
        tags: 'events,toronto'
      };
      
      let content = SCRAPER_TEMPLATE
        .replace(/{{VENUE_NAME}}/g, venue.name)
        .replace(/{{BASE_URL}}/g, venue.url)
        .replace(/{{VENUE_ADDRESS}}/g, venue.address)
        .replace(/{{VENUE_ZIP}}/g, venue.zip)
        .replace(/{{VENUE_LAT}}/g, venue.lat)
        .replace(/{{VENUE_LNG}}/g, venue.lng)
        .replace(/{{CATEGORIES}}/g, venue.categories)
        .replace(/{{TAGS}}/g, venue.tags);
      
      fs.writeFileSync(filePath, content);
      console.log(\`✅ Rebuilt: \${file}\`);
      rebuiltCount++;
      
    } catch (error) {
      console.log(\`❌ Error rebuilding \${file}: \${error.message}\`);
      errorCount++;
    }
  }
  
  console.log(\`\n📊 TORONTO SCRAPER REBUILD SUMMARY:\`);
  console.log(\`✅ Rebuilt: \${rebuiltCount}\`);
  console.log(\`❌ Errors: \${errorCount}\`);
  console.log(\`📁 Total files processed: \${Math.min(files.length, 6)}\`);
}

rebuildTorontoScrapers();
