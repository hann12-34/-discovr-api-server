/**
 * Deep HTML Inspection for Bovine Sex Club
 * This will help us understand the exact structure
 */

const puppeteer = require('puppeteer');

async function inspectBovine() {
  console.log('🔍 Deep HTML Inspection: Bovine Sex Club\n');
  console.log('='.repeat(80));
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser so we can see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📍 Navigating to Bovine Sex Club...');
    await page.goto('https://www.bovinesexclub.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to trigger lazy loading
    console.log('📜 Scrolling page...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'bovine-screenshot.png', fullPage: true });
    
    // Extract all HTML structure
    console.log('\n🔍 Analyzing DOM structure...\n');
    
    const analysis = await page.evaluate(() => {
      const results = {
        allClasses: new Set(),
        allIds: new Set(),
        eventElements: [],
        dateElements: [],
        titleElements: []
      };
      
      // Get all unique classes and IDs
      document.querySelectorAll('*').forEach(el => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(' ').forEach(c => c && results.allClasses.add(c));
        }
        if (el.id) results.allIds.add(el.id);
      });
      
      // Find elements that might be events (contain both date patterns and text)
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent;
        const html = el.outerHTML.substring(0, 200);
        
        // Look for date patterns
        if (text && text.match(/(NOV|DEC|JAN|FEB|MAR)\s+\d{1,2}/i)) {
          results.dateElements.push({
            tag: el.tagName,
            class: el.className,
            id: el.id,
            text: text.trim().substring(0, 100),
            html: html
          });
        }
        
        // Look for potential event containers
        if (el.children.length > 0 && el.children.length < 20) {
          const hasDate = text.match(/(NOV|DEC|JAN|FEB|MAR)\s+\d{1,2}/i);
          const hasText = text.length > 20 && text.length < 500;
          if (hasDate && hasText) {
            results.eventElements.push({
              tag: el.tagName,
              class: el.className,
              id: el.id,
              childCount: el.children.length,
              text: text.trim().substring(0, 150)
            });
          }
        }
      });
      
      return {
        allClasses: Array.from(results.allClasses),
        allIds: Array.from(results.allIds),
        eventElements: results.eventElements.slice(0, 10),
        dateElements: results.dateElements.slice(0, 20)
      };
    });
    
    console.log('📊 Classes found:', analysis.allClasses.length);
    console.log('   Showing first 30:', analysis.allClasses.slice(0, 30).join(', '));
    
    console.log('\n📊 IDs found:', analysis.allIds.length);
    console.log('   All IDs:', analysis.allIds.join(', '));
    
    console.log('\n📅 Date-containing elements:', analysis.dateElements.length);
    analysis.dateElements.forEach((el, i) => {
      console.log(`\n${i+1}. ${el.tag}.${el.class}`);
      console.log(`   Text: ${el.text}`);
      console.log(`   HTML: ${el.html}`);
    });
    
    console.log('\n🎪 Potential event containers:', analysis.eventElements.length);
    analysis.eventElements.forEach((el, i) => {
      console.log(`\n${i+1}. ${el.tag}.${el.class} (${el.childCount} children)`);
      console.log(`   Text: ${el.text}`);
    });
    
    console.log('\n\n✅ Screenshot saved to: bovine-screenshot.png');
    console.log('⏸️  Browser will stay open for 30 seconds for manual inspection...');
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    await browser.close();
    console.log('\n✅ Inspection complete!');
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Error:', error.message);
  }
}

inspectBovine();
