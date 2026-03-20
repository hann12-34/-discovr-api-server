/**
 * Toronto Major Festivals Scraper
 * VELD, Pride, TIFF, Canadian Music Week, Jazz Festival, Nuit Blanche
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎪 Scraping Toronto major festivals...');
  
  const events = [];
  const seenUrls = new Set();
  
  // 1. VELD Music Festival
  try {
    const veldResponse = await axios.get('https://veldmusicfestival.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(veldResponse.data);
    
    // Look for festival dates and lineup
    const festivalTitle = 'VELD Music Festival 2025';
    const festivalUrl = 'https://veldmusicfestival.com/';
    
    // Try to find dates
    let dateText = $('[class*="date"], .festival-date, time').first().text();
    
    // VELD typically Aug 1-3
    let eventDate = null;
    if (dateText) {
      try {
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
          eventDate = parsed.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    
    // Only add if we have a real date - no hardcoded fallback
    if (eventDate) {
      events.push({
        id: uuidv4(),
        title: festivalTitle,
            description: '',
        date: eventDate,
        url: festivalUrl,
        imageUrl: null,
        venue: {
          name: 'Downsview Park',
          address: 'Downsview Park, Toronto',
          city: 'Toronto'
        },
        city: city,
        category: 'Festival',
        source: 'VELD Music Festival'
      });
      console.log(`  ✅ VELD: 1 festival event`);
    } else {
      console.log(`  ⚠️  VELD: skipped - no real date found`);
    }
  } catch (err) {
    console.log(`  ⚠️  VELD error: ${err.message}`);
  }
  
  // 2. Pride Toronto
  try {
    const prideResponse = await axios.get('https://www.pridetoronto.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(prideResponse.data);
    
    $('.event, article, [class*="event"]').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title').first().text().trim();
      let eventUrl = $event.find('a').first().attr('href');
      
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://www.pridetoronto.com' + eventUrl;
      }
      
      if (!title || !eventUrl || seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      const dateEl = $event.find('time, .date, [datetime]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      if (title.length > 3) {
        events.push({
          id: uuidv4(),
          title: title,
            description: '',
          date: eventDate,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'Pride Toronto',
            city: 'Toronto'
          },
          city: city,
          category: 'Festival',
          source: 'Pride Toronto'
        });
      }
    });
    
    console.log(`  ✅ Pride: ${events.filter(e => e.source === 'Pride Toronto').length} events`);
  } catch (err) {
    console.log(`  ⚠️  Pride error: ${err.message}`);
  }
  
  // 3. Toronto Jazz Festival
  try {
    const jazzResponse = await axios.get('https://torontojazz.com/2025-schedule/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(jazzResponse.data);
    
    $('.event, .show, article, [class*="concert"]').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title, .artist').first().text().trim();
      let eventUrl = $event.find('a').first().attr('href');
      
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://torontojazz.com' + eventUrl;
      }
      
      if (!title || !eventUrl || seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      const dateEl = $event.find('time, .date, [datetime]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      if (title.length > 3) {
        events.push({
          id: uuidv4(),
          title: title,
            description: '',
          date: eventDate,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'Toronto Jazz Festival',
            city: 'Toronto'
          },
          city: city,
          category: 'Festival',
          source: 'Toronto Jazz Festival'
        });
      }
    });
    
    console.log(`  ✅ Jazz Festival: ${events.filter(e => e.source === 'Toronto Jazz Festival').length} events`);
  } catch (err) {
    console.log(`  ⚠️  Jazz Festival error: ${err.message}`);
  }
  
  // 4. Canadian Music Week
  try {
    const cmwResponse = await axios.get('https://cmw.net/festival/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(cmwResponse.data);
    
    // Look for artist/show listings
    $('.artist, .show, .event, [class*="performance"]').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .name, .title').first().text().trim();
      let eventUrl = $event.find('a').first().attr('href');
      
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://cmw.net' + eventUrl;
      }
      
      if (!title || !eventUrl || seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      if (title.length > 3) {
        events.push({
          id: uuidv4(),
          title: title,
            description: '',
          date: null, // Will be in May
          url: eventUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'Canadian Music Week',
            city: 'Toronto'
          },
          city: city,
          category: 'Festival',
          source: 'Canadian Music Week'
        });
      }
    });
    
    console.log(`  ✅ CMW: ${events.filter(e => e.source === 'Canadian Music Week').length} events`);
  } catch (err) {
    console.log(`  ⚠️  CMW error: ${err.message}`);
  }

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

  
  console.log(`\n✅ Total festival events: ${events.length}`);
  return filterEvents(events);
}

module.exports = scrape;
