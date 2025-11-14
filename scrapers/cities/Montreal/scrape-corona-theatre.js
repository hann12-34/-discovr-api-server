const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎭 Scraping Corona Theatre events...');
  
  try {
    const response = await axios.get('https://www.coronatheatre.ca/en/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    // Corona Theatre event listings
    $('.event, .show, article, [class*="event"], [class*="show"], .vevent').each((i, el) => {
      const $el = $(el);
      
      // Get title
      let title = '';
      const titleSelectors = ['h1', 'h2', 'h3', '.summary', '.title', '[class*="title"]', 'strong', '.artist'];
      for (const sel of titleSelectors) {
        const text = $el.find(sel).first().text().trim();
        if (text && text.length > 3 && text.length < 150) {
          title = text;
          break;
        }
      }
      
      if (!title || title.length < 3) return;
      
      // Skip junk
      if (title.toLowerCase().includes('corona theatre') || 
          title.toLowerCase().includes('calendar') ||
          title.toLowerCase().includes('all events')) {
        return;
      }
      
      // Get date
      let dateText = '';
      const dateEl = $el.find('time, [datetime], .dtstart, .date, [class*="date"]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
      }
      
      if (!dateText) {
        const fullText = $el.text();
        const patterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*[\s,]+\d{1,2}[\s,]+\d{4}/i,
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
        url = 'https://www.coronatheatre.ca' + url;
      }
      
      // Clean title
      title = title.split('\n')[0].split('|')[0].trim();
      
      const dedupeKey = `${title.toLowerCase().trim()}|${dateText}`;
      
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        
        events.push({
          id: uuidv4(),
          title: title,
          date: dateText,
          url: url || 'https://www.coronatheatre.ca/en/events/',
          imageUrl: imageUrl,
          venue: {
            name: 'Corona Theatre',
            address: '2490 Rue Notre-Dame Ouest, Montreal, QC H3J 1N5',
            city: 'Montreal'
          },
          city: 'Montreal',
          category: 'Concert',
          source: 'Corona Theatre'
        });
        
        console.log(`  ✓ ${title} | ${dateText}`);
      }
    });
    
    console.log(`\n✅ Found ${events.length} Corona Theatre events`);
    return events;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
