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
          date: dateText,
          url: url || 'https://www.mtelus.com/en/calendar/',
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
    
    console.log(`\n✅ Found ${events.length} MTELUS events`);
    return events;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
