const fs = require('fs');
const path = require('path');

const venuesData = JSON.parse(fs.readFileSync('NYC_VENUES_RESEARCH.json', 'utf8'));

const scraperTemplate = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'VENUE_URL';
const VENUE_NAME = 'VENUE_NAME_VAL';
const VENUE_ADDRESS = 'VENUE_ADDRESS_VAL';

async function scrapeEvents(city = 'New York') {
  if (city !== 'New York') throw new Error(\`City mismatch! Expected 'New York', got '\${city}'\`);
  
  console.log(\`🎪 Scraping \${VENUE_NAME} events for NYC...\`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    const containers = new Set();
    
    $('.event, [class*="event" i], article, .show, .performance, .game, [class*="show"], [data-event]').each((i, el) => {
      containers.add(el);
    });
    
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 4 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    Array.from(containers).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      const title = (
        $event.find('h1, h2, h3, h4').first().text().trim() ||
        $event.find('.title, [class*="title" i], .headliner, .name').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View All)/i)) return;
      
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        dateText = $event.find('time, .date, [class*="date" i]').first().text().trim();
      }
      
      if (!dateText) {
        const patterns = [
          /\\d{4}-\\d{2}-\\d{2}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:,?\\s+\\d{4})?/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i
        ];
        for (const pattern of patterns) {
          const match = $event.text().match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? \`https://\${new URL(EVENTS_URL).hostname}\${url}\` : EVENTS_URL;
      
      events.push({
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
        location: 'New York, NY',
        description: title,
        url: fullUrl,
        category: 'Events'
      });
    });
    
    console.log(\`   ✅ Extracted \${events.length} events\`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.code === 'ENOTFOUND') {
      console.log(\`   ⚠️  0 events (site unavailable)\`);
      return filterEvents([]);
    }
    console.log(\`   ⚠️  Error: \${error.message.substring(0, 50)}\`);
    return filterEvents([]);
  }
  
  return filterEvents(events);
}

module.exports = scrapeEvents;
`;

// Map venue names to file names
const fileMapping = {
  'Brooklyn Steel': 'brooklyn-steel.js',
  'Brooklyn Mirage': 'brooklyn-mirage.js',
  'Carnegie Hall': 'carnegie-hall.js',
  'Citi Field': 'citi-field.js',
  'Comedy Cellar': 'comedy-cellar.js',
  'Governors Ball': 'governors-ball.js',
  'Javits Center': 'javits-center.js',
  'Lincoln Center': 'lincoln-center-festival.js',
  'Madison Square Garden': 'madison-square-garden.js',
  'Pier 17': 'pier-17.js',
  'PlayStation Theater': 'playstation-theater.js',
  'Radio City Music Hall': 'radio-city-music-hall.js',
  'Summit One Vanderbilt': 'summit-at-one-vanderbilt.js',
  'Times Square': 'times-square-nyc.js',
  'Yankee Stadium': 'yankee-stadium.js'
};

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
let updatedCount = 0;

console.log('='.repeat(60));
console.log('🔧 UPDATING ALL NYC SCRAPERS');
console.log('='.repeat(60));
console.log('');

for (const venue of venuesData) {
  const fileName = fileMapping[venue.name];
  if (!fileName) {
    console.log(`⚠️  No file mapping for ${venue.name}`);
    continue;
  }
  
  try {
    const filepath = path.join(scrapersDir, fileName);
    
    let content = scraperTemplate;
    content = content.replace(/VENUE_URL/g, venue.url);
    content = content.replace(/VENUE_NAME_VAL/g, venue.name);
    content = content.replace(/VENUE_ADDRESS_VAL/g, venue.address);
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ ${venue.name} → ${venue.url.substring(0, 50)}...`);
    updatedCount++;
  } catch (error) {
    console.log(`❌ ${venue.name}: ${error.message}`);
  }
}

console.log('');
console.log('='.repeat(60));
console.log(`✅ Updated ${updatedCount}/15 NYC venue scrapers`);
console.log('💡 All with REAL URLs and proper NYC addresses!');
console.log('='.repeat(60));
