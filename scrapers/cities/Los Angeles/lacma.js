/**
 * LACMA (Los Angeles County Museum of Art) Events Scraper
 * URL: https://www.lacma.org/calendar
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎨 Scraping LACMA events...');
  const events = [];
  const seenUrls = new Set();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  try {
    const response = await axios.get('https://www.lacma.org/calendar', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 20000
    });
    
    const $ = cheerio.load(response.data);
    
    $('a[href*="/event/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href || seenUrls.has(href)) return;
      seenUrls.add(href);
      
      const fullUrl = href.startsWith('http') ? href : 'https://www.lacma.org' + href;
      const match = href.match(/\/event\/([^\/]+)/);
      if (!match) return;
      
      const title = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (title.length < 3) return;
      
      events.push({
        id: uuidv4(),
        title: title.substring(0, 100),
        date: null, // Will be fetched from event page
        url: fullUrl,
        image: null,
        imageUrl: null,
        venue: {
          name: 'LACMA',
          address: '5905 Wilshire Blvd, Los Angeles, CA 90036',
          city: 'Los Angeles'
        },
        city: 'Los Angeles',
        category: 'Arts & Culture',
        source: 'LACMA'
      });
    });
    
    const months = { 'january':'01','february':'02','march':'03','april':'04','may':'05','june':'06','july':'07','august':'08','september':'09','october':'10','november':'11','december':'12','jan':'01','feb':'02','mar':'03','apr':'04','jun':'06','jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12' };

    for (const event of events.slice(0, 30)) {
      try {
        const resp = await axios.get(event.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          timeout: 10000
        });
        const $e = cheerio.load(resp.data);

        // Image: try multiple sources
        let imgUrl = $e('meta[property="og:image"]').attr('content')
          || $e('meta[name="twitter:image"]').attr('content')
          || null;
        if (!imgUrl) {
          const imgEl = $e('.wp-post-image, .exhibition-image img, article img, figure img, .field--type-image img').first();
          if (imgEl.length) imgUrl = imgEl.attr('src') || imgEl.attr('data-src') || null;
        }
        if (imgUrl && /logo|placeholder|icon|lacma\.org\/wp-content\/themes/i.test(imgUrl)) imgUrl = null;
        if (imgUrl) { event.image = imgUrl; event.imageUrl = imgUrl; }

        // Title: prefer h1
        const pageTitle = $e('h1').first().text().trim();
        if (pageTitle && pageTitle.length > 3) event.title = pageTitle.substring(0, 100);

        // Date: look for explicit future date with year (avoid today's date from page header)
        const pageText = $e('body').text();
        // Try to find opening/start date — prefer lines with year
        const datePatterns = [
          /(opens?|opening|start[s]?|begin[s]?|from)[:\s]+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(202[5-9])/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(202[5-9])/i,
        ];
        for (const pat of datePatterns) {
          const m = pageText.match(pat);
          if (m) {
            const mStr = pat.source.includes('opens') ? m[2] : m[1];
            const day  = pat.source.includes('opens') ? m[3] : m[2];
            const year = pat.source.includes('opens') ? m[4] : m[3];
            const mo = months[mStr.toLowerCase()] || months[mStr.toLowerCase().slice(0,3)];
            if (mo) {
              const candidate = `${year}-${mo}-${day.padStart(2,'0')}`;
              // Skip if candidate is today (likely picked up from nav/header)
              if (candidate !== todayStr) {
                event.date = candidate;
                break;
              }
            }
          }
        }
      } catch (e) {}
    }
    
  } catch (error) {
    console.error('  ⚠️ LACMA error:', error.message);
  }
  
  const validEvents = events.filter(e => e.date && e.date.match(/^\d{4}-\d{2}-\d{2}$/) && e.date !== todayStr);

  console.log(`✅ LACMA: ${validEvents.length} events with dates, ${validEvents.filter(e => e.imageUrl).length} with images`);
  return validEvents;
}

module.exports = scrape;
