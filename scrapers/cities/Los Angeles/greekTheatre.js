/**
 * Greek Theatre LA Scraper
 * Iconic outdoor amphitheater in Griffith Park
 * URL: https://www.lagreektheatre.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeGreekTheatre(city = 'Los Angeles') {
  console.log('🏛️ Scraping Greek Theatre LA...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.lagreektheatre.com/events-tickets/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'June': '06', 'July': '07', 'August': '08', 'September': '09',
        'October': '10', 'November': '11', 'December': '12'
      };
      
      const datePatterns = [
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i
      ];
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const pattern of datePatterns) {
          const dateMatch = line.match(pattern);
          if (dateMatch) {
            const monthStr = dateMatch[1];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3] || currentYear;
            
            const monthKey = Object.keys(months).find(k => 
              monthStr.toLowerCase() === k.toLowerCase() || 
              monthStr.toLowerCase().startsWith(k.toLowerCase().substring(0, 3))
            );
            const month = months[monthKey];
            if (!month) continue;
            
            const isoDate = `${year}-${month}-${day}`;
            
            // Look for title
            let title = null;
            for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
              const potentialTitle = lines[j];
              if (potentialTitle && 
                  potentialTitle.length > 5 && 
                  potentialTitle.length < 120 &&
                  !potentialTitle.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) &&
                  !potentialTitle.includes('Buy') &&
                  !potentialTitle.includes('Tickets')) {
                title = potentialTitle;
                break;
              }
            }
            
            if (title && !seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({ title, date: isoDate });
            }
            break;
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Greek Theatre events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.lagreektheatre.com/events',
      imageUrl: null,
      venue: {
        name: 'Greek Theatre',
        address: '2700 N Vermont Ave, Los Angeles, CA 90027',
        city: 'Los Angeles'
      },
      latitude: 34.1186,
      longitude: -118.2965,
      city: 'Los Angeles',
      category: 'Festival',
      source: 'GreekTheatre'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }

    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Greek Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeGreekTheatre;
