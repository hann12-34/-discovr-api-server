const puppeteer = require('puppeteer');

async function debugFoufounesStructure() {
  console.log('Debugging Foufounes Électriques event structure...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    page.setDefaultNavigationTimeout(60000);
    
    console.log('Navigating to https://www.foufouneselectriques.com/...');
    await page.goto('https://www.foufouneselectriques.com/', { waitUntil: 'networkidle2' });
    
    // Debug page structure
    const pageInfo = await page.evaluate(() => {
      const info = {
        title: document.title,
        url: window.location.href,
        bodyText: document.body ? document.body.innerText.substring(0, 1000) : 'No body',
        eventSelectors: {},
        totalElements: document.querySelectorAll('*').length
      };
      
      // Test various selectors for events
      const selectors = [
        '.event',
        '.show', 
        '.concert',
        '.gig',
        'article',
        '.card',
        '.listing',
        '.event-item',
        '.calendar',
        '.schedule'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        info.eventSelectors[selector] = {
          count: elements.length,
          samples: Array.from(elements).slice(0, 3).map((el, i) => ({
            index: i,
            html: el.outerHTML.substring(0, 300),
            text: el.innerText ? el.innerText.substring(0, 150) : 'No text',
            dateElements: Array.from(el.querySelectorAll('.date, .dates, time, .event-date, .day, .month, .year')).map(dateEl => ({
              selector: dateEl.className || dateEl.tagName,
              text: dateEl.textContent.trim()
            }))
          }))
        };
      });
      
      return info;
    });
    
    console.log('\n=== Foufounes Électriques Page Analysis ===');
    console.log(`Title: ${pageInfo.title}`);
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Total elements: ${pageInfo.totalElements}`);
    console.log(`\nPage content preview:\n${pageInfo.bodyText}...`);
    
    console.log('\n=== Event Selector Analysis ===');
    Object.entries(pageInfo.eventSelectors).forEach(([selector, data]) => {
      if (data.count > 0) {
        console.log(`\n✅ ${selector}: ${data.count} elements found`);
        data.samples.forEach(sample => {
          console.log(`\n   Sample ${sample.index + 1}:`);
          console.log(`   HTML: ${sample.html}...`);
          console.log(`   Text: ${sample.text}...`);
          if (sample.dateElements.length > 0) {
            console.log(`   Date elements found:`);
            sample.dateElements.forEach(dateEl => {
              console.log(`     - ${dateEl.selector}: "${dateEl.text}"`);
            });
          } else {
            console.log(`   No date elements found`);
          }
        });
      } else {
        console.log(`❌ ${selector}: 0 elements`);
      }
    });
    
  } catch (error) {
    console.error('Error debugging Foufounes:', error);
  } finally {
    await browser.close();
  }
}

debugFoufounesStructure();
