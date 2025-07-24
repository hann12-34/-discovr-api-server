const puppeteer = require('puppeteer');

async function debugMtlOrgStructure() {
  console.log('Debugging MTL.org event structure...');
  
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
    
    page.setDefaultNavigationTimeout(45000);
    
    console.log('Navigating to https://www.mtl.org/en/what-to-do/festivals-and-events...');
    await page.goto('https://www.mtl.org/en/what-to-do/festivals-and-events', { waitUntil: 'networkidle2' });
    
    // Debug page structure
    const pageInfo = await page.evaluate(() => {
      const info = {
        title: document.title,
        url: window.location.href,
        bodyText: document.body ? document.body.innerText.substring(0, 500) : 'No body',
        eventSelectors: {},
        totalElements: document.querySelectorAll('*').length
      };
      
      // Test various selectors
      const selectors = [
        '.event',
        '.activity', 
        '.item',
        '.card',
        '.listing',
        '[data-event]',
        '.event-item',
        '.what-to-do',
        'article',
        '.content-item',
        'a[href*="event"]',
        'a[href*="activity"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        info.eventSelectors[selector] = {
          count: elements.length,
          sample: elements.length > 0 ? {
            html: elements[0].outerHTML.substring(0, 200),
            text: elements[0].innerText ? elements[0].innerText.substring(0, 100) : 'No text'
          } : null
        };
      });
      
      return info;
    });
    
    console.log('\n=== MTL.org Page Analysis ===');
    console.log(`Title: ${pageInfo.title}`);
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Total elements: ${pageInfo.totalElements}`);
    console.log(`\nPage content preview: ${pageInfo.bodyText}...`);
    
    console.log('\n=== Event Selector Analysis ===');
    Object.entries(pageInfo.eventSelectors).forEach(([selector, data]) => {
      if (data.count > 0) {
        console.log(`\n✅ ${selector}: ${data.count} elements found`);
        console.log(`   Sample HTML: ${data.sample.html}...`);
        console.log(`   Sample text: ${data.sample.text}...`);
      } else {
        console.log(`❌ ${selector}: 0 elements`);
      }
    });
    
    // Check for JavaScript frameworks
    const frameworks = await page.evaluate(() => {
      const detected = [];
      if (window.React) detected.push('React');
      if (window.Vue) detected.push('Vue');
      if (window.angular) detected.push('Angular');
      if (window.jQuery || window.$) detected.push('jQuery');
      if (document.querySelector('script[src*="react"]')) detected.push('React (script)');
      if (document.querySelector('script[src*="vue"]')) detected.push('Vue (script)');
      if (document.querySelector('script[src*="angular"]')) detected.push('Angular (script)');
      return detected;
    });
    
    console.log(`\n=== JavaScript Frameworks ===`);
    console.log(frameworks.length > 0 ? frameworks.join(', ') : 'None detected');
    
  } catch (error) {
    console.error('Error debugging MTL.org:', error);
  } finally {
    await browser.close();
  }
}

debugMtlOrgStructure();
