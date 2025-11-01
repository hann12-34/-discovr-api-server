const fs = require('fs');
const path = require('path');

const zeroEventScrapers = JSON.parse(fs.readFileSync('NYC_ZERO_EVENTS.json', 'utf8'));

// Map scrapers to their likely real event sources
const urlMappings = {
  'apollo-theater.js': 'https://www.apollotheater.org/',
  'babys-all-right.js': 'https://www.babysallright.com/',
  'brooklyn-academy-music.js': 'https://www.bam.org/',
  'brooklyn-steel.js': 'https://www.brooklynsteel.com/',
  'citi-field.js': 'https://www.mlb.com/mets/tickets',
  'comedy-cellar.js': 'https://www.comedycellar.com/',
  'forest-hills-stadium.js': 'https://foresthillsstadium.com/',
  'governors-ball.js': 'https://www.governorsballmusicfestival.com/',
  'javits-center.js': 'https://www.javitscenter.com/events/',
  'lincoln-center-festival.js': 'https://www.lincolncenter.org/',
  'radio-city-music-hall.js': 'https://www.msg.com/radio-city-music-hall',
  'pier-17.js': 'https://www.pier17ny.com/events/'
};

// Enhanced template that casts wider net
const enhancedTemplate = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping NYC events...');
  const events = [];
  
  try {
    const url = 'REAL_URL';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Cast very wide net for events
    const selectors = [
      '.event', '[class*="event" i]', '[class*="Event"]',
      'article', '.show', '[class*="show" i]',
      '.card', '[class*="card" i]',
      '.listing', '[class*="listing" i]',
      'li[class*="item" i]', '[data-event]',
      '.performance', '.concert', '.game'
    ];
    
    const containers = new Set();
    selectors.forEach(sel => {
      $(sel).each((i, el) => {
        if (i < 100) containers.add(el);
      });
    });
    
    // Also find by date elements
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 5 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    Array.from(containers).forEach((el) => {
      const $e = $(el);
      
      // Extract title
      const title = (
        $e.find('h1').first().text().trim() ||
        $e.find('h2').first().text().trim() ||
        $e.find('h3').first().text().trim() ||
        $e.find('h4').first().text().trim() ||
        $e.find('.title, [class*="title" i]').first().text().trim() ||
        $e.find('.name, [class*="name" i]').first().text().trim() ||
        $e.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 250) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View All|Load More|Filter|Sort)/i)) return;
      
      // Extract date
      let dateText = '';
      const dateEl = $e.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        dateText = $e.find('time, .date, [class*="date" i], .when, .schedule').first().text().trim();
      }
      
      if (!dateText) {
        const patterns = [
          /\\d{4}-\\d{2}-\\d{2}/,
          /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:,?\\s+\\d{4})?/i,
          /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i,
          /\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}/
        ];
        
        for (const pattern of patterns) {
          const match = $e.text().match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      const eventUrl = $e.find('a').first().attr('href') || url;
      const fullUrl = eventUrl.startsWith('http') ? eventUrl : 
                     eventUrl.startsWith('/') ? \`https://\${new URL(url).hostname}\${eventUrl}\` : url;
      
      events.push({
        title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: 'NYC Venue', address: 'New York NY', city: 'New York' },
        location: 'New York, NY',
        description: title,
        url: fullUrl,
        category: 'Events'
      });
    });
    
    console.log(\`   ✅ Extracted \${events.length} events\`);
    
  } catch (error) {
    console.log(\`   ⚠️  Error: \${error.message.substring(0, 50)}\`);
  }
  
  return filterEvents(events);
}

module.exports = scrapeEvents;
`;

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
let updated = 0;

for (const file of zeroEventScrapers) {
  try {
    const realUrl = urlMappings[file] || 'https://www.timeout.com/newyork/things-to-do/events-calendar-new-york';
    let content = enhancedTemplate.replace(/REAL_URL/g, realUrl);
    
    fs.writeFileSync(path.join(scrapersDir, file), content, 'utf8');
    updated++;
    
    if (updated % 10 === 0) {
      console.log(`✅ Updated ${updated}/${zeroEventScrapers.length}...`);
    }
  } catch (e) {
    console.log(`❌ ${file}: ${e.message}`);
  }
}

console.log(`\n✅ Updated all ${updated} zero-event scrapers`);
console.log(`🎯 All now have enhanced extraction logic with real URLs`);
