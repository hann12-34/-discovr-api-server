const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎧 Scraping Stereo Nightclub events...');
  
  try {
    const response = await axios.get('https://stereo.tickit.ca/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    // Stereo uses tickit.ca - look for event listings
    $('.event-item, .event, .show, article, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      // Get title - look for artist names
      let title = '';
      const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.artist', '.title', '[class*="title"]', '[class*="artist"]', 'strong'];
      for (const sel of titleSelectors) {
        const text = $el.find(sel).first().text().trim();
        if (text && text.length > 2 && text.length < 150 && !text.toLowerCase().includes('stereo')) {
          title = text;
          break;
        }
      }
      
      if (!title || title.length < 2) return;
      
      // Get date
      let dateText = '';
      const dateEl = $el.find('time, [datetime], .date, [class*="date"]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        const fullText = $el.text();
        const patterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*[\s,]+\d{1,2}[\s,]+\d{4}/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}[\s,]+\d{4}/i,
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
        url = 'https://stereo.tickit.ca' + url;
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
          url: url,
          imageUrl: null,
          venue: {
            name: 'Stereo Nightclub',
            address: '858 Rue Sainte-Catherine Est, Montreal, QC H2L 2E3',
            city: 'Montreal'
          },
          city: 'Montreal',
          category: 'Nightlife',
          source: 'Stereo Nightclub'
        });
        
        console.log(`  ✓ ${title} | ${dateText}`);
      }
    });
    
    // Fetch og:image from each event URL
    for (const event of events) {
      if (event.url && event.url.startsWith('http')) {
        try {
          const resp = await axios.get(event.url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
          });
          const $evt = cheerio.load(resp.data);
          const ogImage = $evt('meta[property="og:image"]').attr('content');
          if (ogImage) {
            event.imageUrl = ogImage;
            event.image = ogImage;
          }
        } catch (e) {}
      }
    }
    
    console.log(`\n✅ Found ${events.length} Stereo events`);
    return events;
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
