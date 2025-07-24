/**
 * Scraper Diagnostic Tool
 * 
 * This script helps diagnose common issues with scrapers:
 * 1. Tests network connectivity to the target sites
 * 2. Checks for anti-bot measures
 * 3. Captures screenshots of the page state
 * 4. Logs timing information for each step
 * 5. Tests with different browser configurations
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configure which scraper to diagnose
const SCRAPER_NAME = process.argv[2] || 'artGalleryEvents.js';
const TIMEOUT_MS = 45000; // 45 seconds
const OUTPUT_DIR = path.join(__dirname, 'diagnostics');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

async function testDirectRequest(url) {
  console.log(`Testing direct HTTP request to: ${url}`);
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.get(url, (res) => {
      const endTime = Date.now();
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
      console.log(`Time taken: ${endTime - startTime}ms`);

      // Check for bot detection headers
      const securityHeaders = Object.keys(res.headers).filter(header => 
        header.toLowerCase().includes('security') || 
        header.toLowerCase().includes('bot') ||
        header.toLowerCase().includes('protection')
      );
      
      if (securityHeaders.length > 0) {
        console.log(`⚠️ Possible anti-bot measures detected in headers: ${securityHeaders.join(', ')}`);
      }

      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const bodySnippet = body.substring(0, 500);
        console.log(`Response body (first 500 chars): ${bodySnippet}`);
        
        // Look for common anti-bot signatures in the body
        const antiBot = [
          'captcha', 'cloudflare', 'firewall', 'security check',
          'blocked', 'detected automated', 'bot detection'
        ];
        
        const lowerBody = body.toLowerCase();
        const detectedTerms = antiBot.filter(term => lowerBody.includes(term.toLowerCase()));
        
        if (detectedTerms.length > 0) {
          console.log(`⚠️ Possible anti-bot measures in page content: ${detectedTerms.join(', ')}`);
        }
        
        fs.writeFileSync(path.join(OUTPUT_DIR, `direct-request-${new URL(url).hostname}.html`), body);
        console.log(`Saved full response to ${path.join(OUTPUT_DIR, `direct-request-${new URL(url).hostname}.html`)}`);
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet,
          detectedTerms
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error with direct request: ${error.message}`);
      resolve({
        error: error.message
      });
    });
    
    req.end();
  });
}

async function runScraperWithDiagnostics() {
  console.log(`🔎 Running diagnostic on ${SCRAPER_NAME}...`);
  
  try {
    // 1. Get the scraper module and extract the URL
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', SCRAPER_NAME);
    const scraper = require(scraperPath);
    
    if (!scraper || !scraper.url) {
      throw new Error('Scraper has no URL defined or is not properly structured');
    }
    
    const targetUrl = scraper.url;
    console.log(`Target URL: ${targetUrl}`);
    
    // 2. Test direct HTTP request first
    await testDirectRequest(targetUrl);
    
    // 3. Test with different browser configurations
    const configs = [
      { name: 'default', options: { headless: 'new' } },
      { name: 'with-timeout', options: { headless: 'new', timeout: TIMEOUT_MS } },
      { name: 'non-headless', options: { headless: false } },
    ];
    
    for (const config of configs) {
      console.log(`\n🌐 Testing with browser config: ${config.name}`);
      
      const browser = await puppeteer.launch({
        headless: config.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        timeout: config.options.timeout || 30000
      });
      
      const page = await browser.newPage();
      
      // Set up logging
      page.on('console', msg => console.log(`Browser console: ${msg.text()}`));
      
      // Set realistic browser environment
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');
      
      // Set long timeouts
      page.setDefaultNavigationTimeout(config.options.timeout || 30000);
      page.setDefaultTimeout(config.options.timeout || 30000);
      
      try {
        console.log(`Navigating to ${targetUrl}...`);
        const startTime = Date.now();
        
        // Navigate with more generous options
        await page.goto(targetUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: config.options.timeout || 30000
        });
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ Initial page load completed in ${loadTime}ms`);
        
        // Take screenshot
        const screenshotPath = path.join(OUTPUT_DIR, `${path.basename(SCRAPER_NAME, '.js')}-${config.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to ${screenshotPath}`);
        
        // Check for common problematic elements
        const bodyContent = await page.content();
        fs.writeFileSync(path.join(OUTPUT_DIR, `${path.basename(SCRAPER_NAME, '.js')}-${config.name}.html`), bodyContent);
        
        // Evaluate page for useful diagnostics
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            metaRobots: document.querySelector('meta[name="robots"]')?.content || 'None',
            iframeCount: document.querySelectorAll('iframe').length,
            scriptCount: document.querySelectorAll('script').length,
            h1Text: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
            h2Text: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
          };
        });
        
        console.log(`Page info for ${config.name}:`, pageInfo);
        
      } catch (error) {
        console.error(`❌ Error in ${config.name} config:`, error.message);
        
        // Still try to get a screenshot if possible
        try {
          const errorScreenshotPath = path.join(OUTPUT_DIR, `${path.basename(SCRAPER_NAME, '.js')}-${config.name}-error.png`);
          await page.screenshot({ path: errorScreenshotPath });
          console.log(`Error state screenshot saved to ${errorScreenshotPath}`);
        } catch (screenshotError) {
          console.error('Could not take error screenshot');
        }
      } finally {
        await browser.close();
      }
    }
    
    console.log('\n📊 Diagnostic Summary');
    console.log('============================================================');
    console.log(`Scraper: ${SCRAPER_NAME}`);
    console.log(`Target URL: ${targetUrl}`);
    console.log('Check the diagnostics directory for detailed output');
    console.log('============================================================');
    
  } catch (error) {
    console.error('❌ Fatal diagnostic error:', error);
  }
}

runScraperWithDiagnostics().catch(console.error);
