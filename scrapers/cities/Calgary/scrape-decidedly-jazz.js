/**
 * Decidedly Jazz Danceworks Events Scraper
 * URL: https://www.decidedlyjazz.com/performances
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎷 Scraping Decidedly Jazz events...');

  try {
    const response = await axios.get('https://www.decidedlyjazz.com/performances', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    $('a[href*="/performance"], article, .performance, [class*="event"], .show').each((i, el) => {
      const $e = $(el);
      
      let title = $e.find('h1, h2, h3, h4, .title').first().text().trim();
      if (!title) title = $e.attr('title') || '';
      if (!title || title.length < 3 || title.length > 100) return;
      
      if (/menu|filter|search|login|ticket|newsletter/i.test(title)) return;
      
      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      let url = $e.attr('href') || $e.find('a').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = 'https://www.decidedlyjazz.com' + url;
      }

      let image = null;
      const img = $e.find('img').first();
      if (img.length) {
        image = img.attr('src') || img.attr('data-src');
        if (image && (/logo|icon|ui-|svg$/i.test(image))) {
          image = null;
        }
      }

      // Extract date from text
      const dateText = $e.text();
      const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      let eventDate = null;
      if (dateMatch) {
        const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
        const month = months[dateMatch[1].toLowerCase().slice(0,3)];
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
        eventDate = `${year}-${month}-${day}`;
      }
      
      if (title && image && eventDate) {
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: eventDate,
          url: url,
          image: image,
          imageUrl: image,
          description: '',
            venue: {
            name: 'Decidedly Jazz Danceworks',
            address: '111 12 Ave SE, Calgary, AB T2G 0Z9',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Arts & Dance',
          source: 'Decidedly Jazz'
        });
      }
    });

    // Also check for banner images
    $('img[src*="Banner"], img[src*="banner"]').each((i, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('logo') && !seenTitles.has('banner' + i)) {
        seenTitles.add('banner' + i);
        const alt = $(el).attr('alt') || 'DJD Performance';
        // Skip banner events without real dates
        if (false && alt.length > 3) {
          events.push({
            id: uuidv4(),
            title: alt.substring(0, 100),
            date: null,
            url: 'https://www.decidedlyjazz.com/performances',
            image: src,
            imageUrl: src,
            venue: {
              name: 'Decidedly Jazz Danceworks',
              address: '111 12 Ave SE, Calgary, AB T2G 0Z9',
              city: 'Calgary'
            },
            city: 'Calgary',
            category: 'Arts & Dance',
            source: 'Decidedly Jazz'
          });
        }
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


    console.log(`✅ Decidedly Jazz: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Decidedly Jazz error:', error.message);
    return [];
  }
}

module.exports = scrape;
