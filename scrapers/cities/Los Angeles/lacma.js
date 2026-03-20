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
    
    // Fetch dates and images from event pages
    const months = { 'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06', 'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12', 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
    
    for (const event of events.slice(0, 30)) {
      try {
        const resp = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
        const $e = cheerio.load(resp.data);
        const ogImage = $e('meta[property="og:image"]').attr('content');
        if (ogImage && !ogImage.includes('logo')) {
          event.image = ogImage;
          event.imageUrl = ogImage;
        }
        const pageTitle = $e('h1').first().text().trim();
        if (pageTitle && pageTitle.length > 3) event.title = pageTitle.substring(0, 100);
        
        // Extract date from page text - look for 2025/2026 dates only
        const pageText = $e('body').text();
        const dateMatch = pageText.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(2025|2026)/i);
        if (dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const month = months[monthStr] || months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          if (month) event.date = `${year}-${month}-${day}`;
        }
      } catch (e) {}
    }
    
  } catch (error) {
    console.error('  ⚠️ LACMA error:', error.message);
  }
  
  // Filter out events without valid dates
  const validEvents = events.filter(e => e.date && e.date.match(/^\d{4}-\d{2}-\d{2}$/));

  // Fetch descriptions from event detail pages
  for (const event of validEvents) {
    if (event.description || !event.url || !event.url.startsWith('http')) continue;
    try {
      const _r = await axios.get(event.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 8000
      });
      const _$ = cheerio.load(_r.data);
      let _desc = _$('meta[property="og:description"]').attr('content') || '';
      if (!_desc || _desc.length < 20) _desc = _$('meta[name="description"]').attr('content') || '';
      if (!_desc || _desc.length < 20) {
        for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p']) {
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

  console.log(`✅ LACMA: ${validEvents.length} events with dates, ${validEvents.filter(e => e.image).length} with images`);
  return validEvents;
}

module.exports = scrape;
