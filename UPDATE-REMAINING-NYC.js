const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('NYC_REMAINING.json', 'utf8'));

const template = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎸 Scraping VENUE_NAME events...');
  
  const events = [];
  
  try {
    const response = await axios.get('WORKING_URL', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    const containers = new Set();
    
    $('.event, [class*="event" i], article, .show, [class*="show"], [data-event]').each((i, el) => containers.add(el));
    
    $('[datetime], time, .date').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let d = 0; d < 4 && parent; d++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    Array.from(containers).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      const title = (
        $event.find('h1, h2, h3, h4').first().text().trim() ||
        $event.find('.title, [class*="title"]').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        dateText = $event.find('time, .date').first().text().trim();
      }
      
      if (!dateText) {
        const match = $event.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i);
        if (match) dateText = match[0];
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      const url = $event.find('a').first().attr('href') || 'WORKING_URL';
      const fullUrl = url.startsWith('http') ? url : \`https://\${new URL('WORKING_URL').hostname}\${url}\`;
      
      events.push({
        title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: 'VENUE_NAME', address: 'VENUE_ADDRESS', city: 'New York' },
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

for (const venue of data) {
  try {
    let content = template;
    content = content.replace(/WORKING_URL/g, venue.workingUrl);
    content = content.replace(/VENUE_NAME/g, venue.name.replace(/'/g, "\\'"));
    content = content.replace(/VENUE_ADDRESS/g, venue.address);
    
    fs.writeFileSync(path.join(scrapersDir, venue.file), content, 'utf8');
    console.log(`✅ ${venue.name}`);
    updated++;
  } catch (e) {
    console.log(`❌ ${venue.name}: ${e.message}`);
  }
}

console.log(`\n✅ Updated ${updated}/10 scrapers`);
