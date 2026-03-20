const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Montreal') {
  console.log('⚡ Scraping Foufounes Électriques with Puppeteer...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://foufounes.qc.ca/programmation/', { 
      waitUntil: 'networkidle2', 
      timeout: 25000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const events = await page.evaluate(() => {
      const results = [];
      const eventCards = document.querySelectorAll('article, .event, [class*="event"], [class*="show"]');
      
      eventCards.forEach(card => {
        // Get title
        let title = '';
        const titleEl = card.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
        if (titleEl) {
          title = titleEl.textContent.trim();
        }
        
        if (!title || title.length < 2) return;
        
        // Get date
        let dateText = '';
        const timeEl = card.querySelector('time, [datetime], .date, [class*="date"]');
        if (timeEl) {
          dateText = timeEl.getAttribute('datetime') || timeEl.textContent.trim();
        }
        
        if (!dateText) {
          const allText = card.textContent;
          const patterns = [
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
            /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i
          ];
          
          for (const pattern of patterns) {
            const match = allText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
        }
        
        if (!dateText || dateText.length < 4) return;
        
        // Get URL
        let url = '';
        const linkEl = card.querySelector('a');
        if (linkEl) {
          url = linkEl.getAttribute('href') || '';
          if (url && !url.startsWith('http')) {
            url = 'https://www.foufounes.qc.ca' + url;
          }
        }
        
        results.push({
          title: title.split('\n')[0].trim(),
          date: dateText,
          url: url
        });
      });
      
      return results;
    });
    
    const formattedEvents = events.map(e => ({
      id: uuidv4(),
      title: e.title,
        description: '',
      date: e.date,
      url: e.url,
      image: null,
      venue: {
        name: 'Foufounes Électriques',
        address: '87 Rue Sainte-Catherine Est, Montreal, QC H2X 1K5',
        city: 'Montreal'
      },
      city: 'Montreal',
      category: 'Nightlife',
      source: 'Foufounes Électriques'
    }));
    
    // Fetch og:image from each event URL
    for (const event of formattedEvents) {
      if (event.url && event.url.startsWith('http')) {
        try {
          const resp = await axios.get(event.url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
          });
          const $ = cheerio.load(resp.data);
          const ogImage = $('meta[property="og:image"]').attr('content');
          if (ogImage) {
            event.image = ogImage;
          }
        } catch (e) {}
      }
      console.log(`  ✓ ${event.title} | ${event.date} ${event.image ? '📷' : ''}`);
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

    
    console.log(`\n✅ Found ${formattedEvents.length} Foufounes Électriques events`);
    return formattedEvents;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeEvents;
