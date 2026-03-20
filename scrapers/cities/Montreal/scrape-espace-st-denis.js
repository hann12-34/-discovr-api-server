const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Espace St-Denis with Puppeteer...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://espacestdenis.com/programmation/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for events to load
    await page.waitForSelector('[class*="eventCard"], .show, article', { timeout: 15000 }).catch(() => {
      console.log('  ⚠️  No events found with initial selector, trying alternatives...');
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Give React/Vue time to render
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // Look for all links containing event details
      const links = Array.from(document.querySelectorAll('a[href*="/spectacle/"]'));
      
      links.forEach(link => {
        // Get the parent card/container
        const card = link.closest('[class*="card"], [class*="event"], article, .show') || link;
        
        // Extract title - look for h2, h3, or strong text
        const titleEl = card.querySelector('h1, h2, h3, strong, [class*="title"]');
        const title = titleEl ? titleEl.textContent.trim() : link.textContent.trim();
        
        // Extract date - look for date elements
        const dateEl = card.querySelector('time, [class*="date"], .datetime, [datetime]');
        let dateText = '';
        if (dateEl) {
          dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
        }
        
        // Extract venue - look for venue/location elements
        const venueEl = card.querySelector('[class*="venue"], [class*="lieu"], [class*="location"], .place');
        const venue = venueEl ? venueEl.textContent.trim() : '';
        
        const url = link.href;
        // Get image
        const img = el.querySelector('img');
        const imageUrl = img ? (img.src || img.getAttribute('data-src') || '') : '';

        if (title && title.length > 2 && !title.toLowerCase().includes('billets')) {
          results.push({ title, dateText, venue, url });
        }
      });
      
      return results;
    });
    
    await browser.close();
    
    console.log(`  Found ${events.length} raw events`);
    
    // Format events
    const formattedEvents = [];
    const seen = new Set();
    
    for (const event of events) {
      // Parse date
      let eventDate = null;
      
      if (event.dateText) {
        // Try to parse date from French formats
        // "20 novembre 2025" or "Nov 20, 2025" or "2025-11-20"
        const monthMap = {
          'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
          'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
          'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12',
          'jan': '01', 'fév': '02', 'mar': '03', 'avr': '04',
          'mai': '05', 'jun': '06', 'jul': '07', 'aoû': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'déc': '12'
        };
        
        // Try ISO format first
        const isoMatch = event.dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          eventDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        } else {
          // Try French format: "20 novembre 2025"
          const frMatch = event.dateText.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i);
          if (frMatch) {
            const day = frMatch[1].padStart(2, '0');
            const month = monthMap[frMatch[2].toLowerCase()];
            const year = frMatch[3];
            eventDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!eventDate) continue;
      
      // Determine venue - prefer extracted venue, fallback to detected from title
      let venueName = event.venue || 'Théâtre St-Denis';
      if (event.venue.includes('Studio-Cabaret') || event.title.includes('Studio-Cabaret')) {
        venueName = 'Le Studio-Cabaret';
      } else if (event.venue.includes('Théâtre St-Denis') || event.title.includes('Théâtre St-Denis')) {
        venueName = 'Théâtre St-Denis';
      } else if (event.venue.includes('Salle Émile-Legault') || event.title.includes('Salle Émile-Legault')) {
        venueName = 'Salle Émile-Legault';
      }
      
      const dedupeKey = `${event.title.toLowerCase().trim()}|${eventDate}`;
      
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        
        formattedEvents.push({
          id: uuidv4(),
          title: event.title,
          date: eventDate,
          url: event.url,
          venue: { 
            name: venueName,
            address: '1594 St Denis St, Montreal, QC H2X 3K2', 
            city: 'Montreal' 
          },
          city: 'Montreal',
          category: 'Concert',
          source: 'Espace St-Denis'
        });
        
        console.log(`  ✓ ${event.title} | ${eventDate} | ${venueName}`);
      }
    }

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

    
    console.log(`\n✅ Found ${formattedEvents.length} Espace St-Denis events`);
    return formattedEvents;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeEvents;
