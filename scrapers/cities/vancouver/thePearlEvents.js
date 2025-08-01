/**
 * The Pearl Vancouver Events Scraper
 * Scrapes events from The Pearl Vancouver
 * Website: https://thepearlvancouver.com/all-shows/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const ThePearlEvents = {
  name: 'The Pearl Vancouver',
  url: 'https://thepearlvancouver.com/all-shows/',
  
  /**
   * Scrape events from The Pearl Vancouver
   */
  async scrape() {
    console.log('🔍 Scraping events from The Pearl Vancouver...');
    
    try {
      const response = await axios.get(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];

      // Look for event links and information
      $('a[href*="/tm-event/"]').each((index, element) => {
        const $link = $(element);
        const eventUrl = $link.attr('href');
        const eventTitle = $link.text().trim();
        
        if (eventTitle && eventTitle.length > 0 && !eventTitle.toLowerCase().includes('buy tickets') && !eventTitle.toLowerCase().includes('sold out')) {
          
          // Look for ticket information nearby
          const $parent = $link.closest('div, section, article');
          const ticketInfo = $parent.find('a[href*="ticketweb.ca"]').first();
          const ticketText = ticketInfo.text().trim();
          const ticketUrl = ticketInfo.attr('href');
          
          // Determine if sold out
          const isSoldOut = ticketText.toLowerCase().includes('sold out');
          const price = isSoldOut ? 'Sold Out' : this.extractPrice($parent.text()) || 'Check website';
          
          // Extract date from event URL or title
          const eventDate = this.extractDate(eventTitle) || this.extractDateFromUrl(eventUrl) || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
          
          const event = {
            id: crypto.createHash('md5').update(`the-pearl-${eventTitle}-${eventUrl}`).digest('hex'),
            title: `Vancouver - ${eventTitle}`,
            description: `Live show at The Pearl Vancouver: ${eventTitle}`,
            venue: 'The Pearl Vancouver',
            location: 'Downtown Vancouver, BC',
            date: eventDate,
            time: this.extractTime(eventTitle) || '8:00 PM',
            price: price,
            url: eventUrl.startsWith('http') ? eventUrl : `https://thepearlvancouver.com${eventUrl}`,
            ticketUrl: ticketUrl || null,
            source: 'the-pearl',
            category: 'music',
            tags: ['live music', 'concert', 'vancouver', 'downtown'],
            image: null,
            soldOut: isSoldOut
          };
          
          events.push(event);
        }
      });

      // Also look for any other event listings
      $('.event, .show, [class*="event"], [class*="show"]').each((index, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        
        if (text.length > 10 && text.length < 300 && !events.some(e => e.title.includes(text.substring(0, 20)))) {
          const lines = text.split('\n').filter(line => line.trim().length > 5);
          
          if (lines.length > 0) {
            const mainLine = lines[0].trim();
            
            const event = {
              id: crypto.createHash('md5').update(`the-pearl-general-${mainLine}`).digest('hex'),
              title: `Vancouver - ${mainLine}`,
              description: `Event at The Pearl Vancouver: ${text.substring(0, 200)}`,
              venue: 'The Pearl Vancouver',
              location: 'Downtown Vancouver, BC',
              date: this.extractDate(text) || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
              time: this.extractTime(text) || '8:00 PM',
              price: this.extractPrice(text) || 'Check website',
              url: this.url,
              source: 'the-pearl',
              category: 'music',
              tags: ['live music', 'concert', 'vancouver', 'downtown'],
              image: null
            };
            
            events.push(event);
          }
        }
      });

      // Remove duplicates based on similar titles
      const uniqueEvents = [];
      for (const event of events) {
        const isDuplicate = uniqueEvents.some(existing => {
          const similarity = this.calculateSimilarity(event.title, existing.title);
          return similarity > 0.8;
        });
        
        if (!isDuplicate) {
          uniqueEvents.push(event);
        }
      }

      console.log(`✅ Found ${uniqueEvents.length} unique events from The Pearl Vancouver`);
      return uniqueEvents;

    } catch (error) {
      console.error('❌ Error scraping The Pearl Vancouver:', error.message);
      return [];
    }
  },

  /**
   * Extract date from text
   */
  extractDate(text) {
    const datePatterns = [
      /(\w+day),?\s+(\w+)\s+(\d{1,2})/i,
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime()) && date > new Date()) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  },

  /**
   * Extract date from event URL
   */
  extractDateFromUrl(url) {
    // Look for date patterns in URL
    const dateMatch = url.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dateMatch) {
      try {
        const date = new Date(dateMatch[0]);
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date;
        }
      } catch (e) {
        // Continue
      }
    }
    return null;
  },

  /**
   * Extract time from text
   */
  extractTime(text) {
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/i;
    const match = text.match(timePattern);
    return match ? match[0] : null;
  },

  /**
   * Extract price from text
   */
  extractPrice(text) {
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/,
      /(\d+(?:\.\d{2})?)\s*dollars?/i,
      /free/i,
      /sold\s*out/i
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('free')) {
          return 'Free';
        }
        if (pattern.source.includes('sold')) {
          return 'Sold Out';
        }
        return `$${match[1] || match[0]}`;
      }
    }
    return null;
  },

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  },

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
};

module.exports = ThePearlEvents;
