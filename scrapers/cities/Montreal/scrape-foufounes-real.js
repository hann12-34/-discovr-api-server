const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'https://foufounes.ca/agenda/';
const VENUE_NAME = 'Les Foufounes Electriques';
const VENUE_ADDRESS = '87 Rue Sainte-Catherine E Montreal QC H2X 1K5';

async function foufounesrealEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🎪 Scraping ${VENUE_NAME} events for Montreal...`);
  
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
          /\d{4}-\d{2}-\d{2}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?/i
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
                     url.startsWith('/') ? `https://${new URL(EVENTS_URL).hostname}${url}` : EVENTS_URL;
      
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
    
    console.log(`   ✅ Extracted ${events.length} events`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.code === 'ENOTFOUND') {
      console.log(`   ⚠️  0 events (site unavailable)`);
      return filterEvents([]);
    }
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
    return filterEvents([]);
  }
  
  return filterEvents(events);
}

module.exports = foufounesrealEvents;
