const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Montreal') {
  console.log('🏭 Scraping New City Gas events...');
  
  try {
    const response = await axios.get('https://newcitygas.com/evenements/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    // New City Gas event listings
    $('.event, .show, article, [class*="event"], [class*="evenement"]').each((i, el) => {
      const $el = $(el);
      
      // Get title
      let title = '';
      const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '[class*="title"]', '[class*="titre"]', 'strong'];
      for (const sel of titleSelectors) {
        const text = $el.find(sel).first().text().trim();
        if (text && text.length > 2 && text.length < 150) {
          title = text;
          break;
        }
      }
      
      if (!title || title.length < 2) return;
      
      // Skip junk
      if (title.toLowerCase().includes('new city gas') || 
          title.toLowerCase().includes('calendar')) {
        return;
      }
      
      // Get date
      let dateText = '';
      const dateEl = $el.find('time, [datetime], .date, [class*="date"]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        const fullText = $el.text();
        // French and English date patterns including "13.Nov" format
        const patterns = [
          /\d{1,2}\.(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Déc)/i,  // "13.Nov" format
          /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i,
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
        url = 'https://newcitygas.com' + url;
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
          url: url || 'https://newcitygas.com/evenements/',
          imageUrl: imageUrl,
          venue: {
            name: 'New City Gas',
            address: '950 Rue Ottawa, Montreal, QC H3C 1S4',
            city: 'Montreal'
          },
          city: 'Montreal',
          category: 'Nightlife',
          source: 'New City Gas'
        });
        
        console.log(`  ✓ ${title} | ${dateText}`);
      }
    });
    
    console.log(`\n✅ Found ${events.length} New City Gas events`);
    return events;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
