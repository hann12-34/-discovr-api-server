const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎵 Scraping MTELUS events...');
  
  try {
    const response = await axios.get('https://evenko.ca/en/events/venue/mtelus', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 20000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    // MTELUS uses event cards/tiles
    $('.event, .show, article, [class*="event"], [class*="show"]').each((i, el) => {
      const $el = $(el);
      
      // Get title
      let title = '';
      const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '[class*="title"]', 'strong', '.artist', '[class*="artist"]'];
      for (const sel of titleSelectors) {
        const text = $el.find(sel).first().text().trim();
        if (text && text.length > 3 && text.length < 150) {
          title = text;
          break;
        }
      }
      
      if (!title || title.length < 3) return;
      
      // Get date
      let dateText = '';
      const dateEl = $el.find('time, [datetime], .date, [class*="date"]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        const fullText = $el.text();
        const patterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}[\s,]+\d{4}/i,
          /\d{4}-\d{2}-\d{2}/,
          /\d{1,2}\/\d{1,2}\/\d{4}/
        ];
        
        for (const pattern of patterns) {
          const match = fullText.match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      // Get URL
      let url = $el.find('a').first().attr('href') || '';
      if (url && !url.startsWith('http')) {
        url = 'https://www.mtelus.com' + url;
      }
      
      // Clean title
      title = title.split('\n')[0].trim();
      
      const dedupeKey = `${title.toLowerCase().trim()}|${dateText}`;
      
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        
        events.push({
          id: uuidv4(),
          title: title,
            description: '',
          date: dateText,
          url: url,
          imageUrl: imageUrl,
          venue: {
            name: 'MTELUS',
            address: '59 Rue Sainte-Catherine Est, Montreal, QC H2X 1K5',
            city: 'Montreal'
          },
          city: 'Montreal',
          category: 'Concert',
          source: 'MTELUS'
        });
        
        console.log(`  ✓ ${title} | ${dateText}`);
      }
    });

      // Fetch descriptions from event detail pages
      for (const event of events) {
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

    
    console.log(`\n✅ Found ${events.length} MTELUS events`);
    return events;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
