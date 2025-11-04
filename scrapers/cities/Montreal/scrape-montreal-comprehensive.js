const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText, isTitleJustADate } = require('../../utils/city-util');

// Comprehensive Montreal event sources
const SOURCES = [
  {
    name: 'MTL Blog Events',
    url: 'https://www.mtlblog.com/things-to-do-in-montreal',
    selectors: {
      container: '.event, article, .card',
      title: 'h2, h3, .title',
      date: 'time, .date'
    }
  },
  {
    name: 'Cult MTL',
    url: 'https://cultmtl.com/events/',
    selectors: {
      container: '.event, article',
      title: 'h2, h3',
      date: 'time, .date'
    }
  },
  {
    name: 'Montreal.com Events',
    url: 'https://www.montreal.com/events',
    selectors: {
      container: '.event, article, .listing',
      title: 'h2, h3, .event-title',
      date: 'time, .date, .event-date'
    }
  }
];

async function montrealComprehensiveEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🌐 Scraping comprehensive Montreal event sources...`);
  
  const allEvents = [];
  
  for (const source of SOURCES) {
    try {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 1000));
      
      const response = await axios.get(source.url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
        }
      });
      
      const $ = cheerio.load(response.data);
      const events = [];
      
      $(source.selectors.container).each((i, el) => {
        if (i > 50) return false;
        
        const $event = $(el);
        
        const title = $event.find(source.selectors.title).first().text().trim() ||
                     $event.find('h1, h2, h3, h4').first().text().trim() ||
                     $event.find('a').first().text().trim();
        
        if (!title || title.length < 3 || title.length > 200) return;
        if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View|Filter|Sort|See|All|More|Load)/i)) return;
        if (isTitleJustADate(title)) return;
        
        let dateText = $event.find('[datetime]').first().attr('datetime') ||
                      $event.find(source.selectors.date).first().text().trim() ||
                      $event.find('time, .date, [class*="date"]').first().text().trim();
        
        if (!dateText) {
          const patterns = [
            /\d{4}-\d{2}-\d{2}/,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?/i,
            /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)[a-z]*/i
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
        
        const venueName = $event.find('.venue, [class*="location"]').first().text().trim() || 'Montreal Venue';
        const venueAddress = $event.find('.address, [class*="address"]').first().text().trim() || 'Montreal, QC';
        
        const eventUrl = $event.find('a').first().attr('href') || '';
        const fullUrl = eventUrl.startsWith('http') ? eventUrl :
                       eventUrl.startsWith('/') ? `${new URL(source.url).origin}${eventUrl}` :
                       source.url;
        
        events.push({
          title: title,
          date: parsedDate.startDate.toISOString(),
          venue: { 
            name: venueName, 
            address: venueAddress,
            city: 'Montreal' 
          },
          location: 'Montreal, QC',
          description: title,
          url: fullUrl,
          category: 'Events'
        });
      });
      
      allEvents.push(...events);
      console.log(`   ✅ ${source.name}: ${events.length} events`);
      
    } catch (error) {
      console.log(`   ⚠️  ${source.name}: 0 events`);
    }
  }
  
  console.log(`   📊 Total comprehensive events: ${allEvents.length}`);
  return filterEvents(allEvents);
}

module.exports = montrealComprehensiveEvents;
