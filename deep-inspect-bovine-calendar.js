/**
 * Deep inspection of Bovine calendar widget
 * to understand how to access all 100+ events
 */

const puppeteer = require('puppeteer');

async function deepInspect() {
  console.log('🔬 Deep Calendar Inspection\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://www.bovinesexclub.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('⏳ Waiting...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Analyze calendar widget structure
    const analysis = await page.evaluate(() => {
      const results = {
        gridItems: 0,
        scriptTags: 0,
        calendarControls: [],
        viewOptions: [],
        allEventTexts: []
      };
      
      // Count grid items
      results.gridItems = document.querySelectorAll('.eapp-events-calendar-grid-item').length;
      
      // Count schema.org scripts
      results.scriptTags = document.querySelectorAll('script[type="application/ld+json"]').length;
      
      // Look for calendar controls (month picker, view switcher, etc.)
      const controls = document.querySelectorAll('[class*="calendar"], [class*="header"], [class*="control"], [class*="filter"], [class*="view"]');
      controls.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 0 && text.length < 100) {
          results.calendarControls.push({
            text: text,
            class: el.className,
            tag: el.tagName
          });
        }
      });
      
      // Look for view options/buttons
      const buttons = document.querySelectorAll('button, [role="button"], select, [class*="toggle"]');
      buttons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text.length > 0 && text.length < 50 && 
            (text.toLowerCase().includes('view') || 
             text.toLowerCase().includes('list') ||
             text.toLowerCase().includes('grid') ||
             text.toLowerCase().includes('calendar') ||
             text.toLowerCase().includes('all') ||
             text.toLowerCase().includes('month'))) {
          results.viewOptions.push({
            text: text,
            class: btn.className,
            tag: btn.tagName
          });
        }
      });
      
      // Get all event-related text to see patterns
      const eventEls = document.querySelectorAll('[class*="event"]');
      eventEls.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 10 && text.length < 200) {
          results.allEventTexts.push(text.substring(0, 100));
        }
      });
      
      return results;
    });
    
    console.log('\n📊 ANALYSIS:');
    console.log(`  Grid items found: ${analysis.gridItems}`);
    console.log(`  Schema.org scripts: ${analysis.scriptTags}`);
    console.log(`\n🎛️  Calendar controls found: ${analysis.calendarControls.length}`);
    analysis.calendarControls.slice(0, 10).forEach(c => {
      console.log(`    "${c.text}" (${c.tag}.${c.class.substring(0, 50)})`);
    });
    
    console.log(`\n👁️  View options found: ${analysis.viewOptions.length}`);
    analysis.viewOptions.forEach(v => {
      console.log(`    "${v.text}" (${v.tag})`);
    });
    
    console.log(`\n📝 Sample event texts: ${analysis.allEventTexts.length}`);
    analysis.allEventTexts.slice(0, 5).forEach(t => {
      console.log(`    "${t}"`);
    });
    
    // Try clicking through next button multiple times
    console.log('\n\n🖱️  Attempting to load all events by clicking "Next" repeatedly...');
    let totalClicks = 0;
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const nextBtn = buttons.find(b => b.textContent.trim() === 'Next Events');
        if (nextBtn) {
          nextBtn.click();
          return true;
        }
        return false;
      });
      
      if (!clicked) break;
      
      totalClicks++;
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const count = await page.evaluate(() => {
        return document.querySelectorAll('.eapp-events-calendar-grid-item').length;
      });
      
      console.log(`    Click ${totalClicks}: ${count} events visible`);
    }
    
    const finalCount = await page.evaluate(() => {
      return document.querySelectorAll('.eapp-events-calendar-grid-item').length;
    });
    
    const finalScripts = await page.evaluate(() => {
      return document.querySelectorAll('script[type="application/ld+json"]').length;
    });
    
    console.log(`\n✅ After ${totalClicks} clicks:`);
    console.log(`    Grid items: ${finalCount}`);
    console.log(`    Schema.org scripts: ${finalScripts}`);
    
    console.log('\n⏸️  Browser staying open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    await browser.close();
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Error:', error.message);
  }
}

deepInspect();
