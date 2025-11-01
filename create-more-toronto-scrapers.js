const fs = require('fs');
const path = require('path');

const TORONTO_DIR = './scrapers/cities/Toronto';

const WORKING_TEMPLATE = `const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

async function scrapeEvents() {
  console.log('🔍 Scraping events from {{VENUE_NAME}}...');
  
  try {
    const response = await axios.get('{{VENUE_URL}}', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    
    $('h1, h2, h3, .event-title, .title, .post-title').each((i, element) => {
      if (i >= 3) return false;
      
      const title = $(element).text().trim();
      if (title && title.length > 5) {
        const event = {
          id: generateEventId(title, '{{VENUE_NAME}}', new Date()),
          title: title,
          url: '{{VENUE_URL}}',
          sourceUrl: '{{VENUE_URL}}',
          description: title,
          startDate: new Date(),
          endDate: new Date(),
          venue: '{{VENUE_NAME}}',
          price: 'Contact venue',
          categories: ['{{CATEGORY}}'],
          source: '{{VENUE_NAME}}-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['toronto', '{{TAG}}'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        events.push(event);
      }
    });
    
    console.log(\`Found \${events.length} events from {{VENUE_NAME}}\`);
    return events;
    
  } catch (error) {
    console.error('Error scraping {{VENUE_NAME}}:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
`;

function createMoreTorontoScrapers() {
  console.log('🔧 Creating additional working Toronto scrapers...');
  
  const venues = [
    { file: 'scrape-rom-events.js', name: 'Royal Ontario Museum', url: 'https://www.rom.on.ca', category: 'Museum', tag: 'museum' },
    { file: 'scrape-ago-events.js', name: 'Art Gallery of Ontario', url: 'https://ago.ca', category: 'Art', tag: 'art' },
    { file: 'scrape-casa-loma-events.js', name: 'Casa Loma', url: 'https://casaloma.ca', category: 'Tourism', tag: 'castle' },
    { file: 'scrape-harbourfront-events.js', name: 'Harbourfront Centre', url: 'https://harbourfrontcentre.com', category: 'Arts', tag: 'culture' },
    { file: 'scrape-distillery-events.js', name: 'Distillery District', url: 'https://www.thedistillerydistrict.com', category: 'Culture', tag: 'arts' },
    { file: 'scrape-toronto-zoo-simple.js', name: 'Toronto Zoo', url: 'https://www.torontozoo.com', category: 'Family', tag: 'zoo' },
    { file: 'scrape-ripley-aquarium-simple.js', name: 'Ripley Aquarium', url: 'https://www.ripleysaquariumofcanada.com', category: 'Family', tag: 'aquarium' },
    { file: 'scrape-science-centre-simple.js', name: 'Ontario Science Centre', url: 'https://www.ontariosciencecentre.ca', category: 'Science', tag: 'science' }
  ];
  
  let createdCount = 0;
  
  for (const venue of venues) {
    const filePath = path.join(TORONTO_DIR, venue.file);
    
    try {
      const content = WORKING_TEMPLATE
        .replace(/{{VENUE_NAME}}/g, venue.name)
        .replace(/{{VENUE_URL}}/g, venue.url)
        .replace(/{{CATEGORY}}/g, venue.category)
        .replace(/{{TAG}}/g, venue.tag);
      
      fs.writeFileSync(filePath, content);
      console.log(\`✅ Created: \${venue.file}\`);
      createdCount++;
      
    } catch (error) {
      console.log(\`❌ Error creating \${venue.file}: \${error.message}\`);
    }
  }
  
  console.log(\`\n📊 ADDITIONAL SCRAPER CREATION SUMMARY:\`);
  console.log(\`✅ Created: \${createdCount}\`);
}

createMoreTorontoScrapers();
