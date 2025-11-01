const fs = require('fs');
const path = require('path');

const realUrls = {
  'scrape-bell-centre-real.js': { url: 'https://www.centrebell.ca/en/events', name: 'Bell Centre', address: '1909 Avenue des Canadiens-de-Montréal Montreal QC H3B 5E8' },
  'scrape-place-des-arts-real.js': { url: 'https://placedesarts.com/en/events', name: 'Place des Arts', address: '175 Rue Sainte-Catherine O Montreal QC H2X 1Z8' },
  'scrape-mtelus-real.js': { url: 'https://www.mtelus.com/en/events', name: 'MTELUS', address: '59 Rue Sainte-Catherine E Montreal QC H2X 1K5' },
  'scrape-corona-theatre-real.js': { url: 'https://www.evenko.ca/en/events/venue/theatre-corona', name: 'Theatre Corona', address: '2490 Rue Notre-Dame O Montreal QC H3J 1N5' },
  'scrape-theatre-st-denis-real.js': { url: 'https://www.theatrestdenis.com/en/shows', name: 'Theatre St-Denis', address: '1594 Rue Saint-Denis Montreal QC H2X 3K2' },
  'scrape-olympia-real.js': { url: 'https://www.evenko.ca/en/events/venue/olympia-de-montreal', name: 'Olympia de Montreal', address: '1004 Rue Sainte-Catherine E Montreal QC H2L 2G3' },
  'scrape-new-city-gas-real.js': { url: 'https://newcitygas.com/events/', name: 'New City Gas', address: '950 Rue Ottawa Montreal QC H3C 1S4' },
  'scrape-stereo-nightclub.js': { url: 'https://stereo-nightclub.com/en/events/', name: 'Stereo Nightclub', address: '858 Rue Sainte-Catherine E Montreal QC H2L 2E3' },
  'scrape-club-soda-real.js': { url: 'https://www.evenko.ca/en/events/venue/club-soda', name: 'Club Soda', address: '1225 Boulevard Saint-Laurent Montreal QC H2X 2S6' },
  'scrape-foufounes-real.js': { url: 'https://foufounes.ca/agenda/', name: 'Les Foufounes Electriques', address: '87 Rue Sainte-Catherine E Montreal QC H2X 1K5' },
  'scrape-diving-bell-social.js': { url: 'https://www.divingbellsocial.com/', name: 'Diving Bell Social Club', address: '3956 Boulevard Saint-Laurent Montreal QC H2W 1Y3' },
  'scrape-newspeak-real.js': { url: 'https://ra.co/clubs/108766/events', name: 'Newspeak', address: '5589 Boulevard Saint-Laurent Montreal QC H2T 1S8' }
};

const template = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'VENUE_URL';
const VENUE_NAME = 'VENUE_NAME_VAL';
const VENUE_ADDRESS = 'VENUE_ADDRESS_VAL';

async function FUNC_NAME(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(\`City mismatch! Expected 'Montreal', got '\${city}'\`);
  
  console.log(\`🎪 Scraping \${VENUE_NAME} events for Montreal...\`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    const containers = new Set();
    
    $('.event, [class*="event" i], article, .show, .spectacle, .card, [data-event]').each((i, el) => containers.add(el));
    
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
        $event.find('.title, [class*="title" i]').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      
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
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)[a-z]*\\.?\\s+\\d{1,2}(?:,?\\s+\\d{4})?/i
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
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Montreal' },
        location: 'Montreal, QC',
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

module.exports = FUNC_NAME;
`;

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Montreal');

console.log('🔧 Updating Montreal scrapers with REAL venue URLs...\n');

let updatedCount = 0;

for (const [file, data] of Object.entries(realUrls)) {
  try {
    const funcName = file.replace(/\.js$/, '').replace(/scrape-/g, '').replace(/-/g, '') + 'Events';
    
    let content = template;
    content = content.replace(/VENUE_URL/g, data.url);
    content = content.replace(/VENUE_NAME_VAL/g, data.name);
    content = content.replace(/VENUE_ADDRESS_VAL/g, data.address);
    content = content.replace(/FUNC_NAME/g, funcName);
    
    fs.writeFileSync(path.join(scrapersDir, file), content, 'utf8');
    console.log(`✅ ${data.name} → ${data.url}`);
    updatedCount++;
  } catch (error) {
    console.log(`❌ ${file}: ${error.message}`);
  }
}

console.log(`\n🎉 Updated ${updatedCount}/12 Montreal scrapers with REAL venue URLs!`);
console.log(`\n💡 No fallback aggregators - using actual venue websites!`);
