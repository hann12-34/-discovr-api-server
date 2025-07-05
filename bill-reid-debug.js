/**
 * Debug script to analyze the structure of Bill Reid Gallery website
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

async function analyzeGalleryPage() {
  console.log('Starting Bill Reid Gallery website analysis...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Set viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
    
    // First check the current exhibition page
    console.log('Navigating to current exhibition page...');
    await page.goto('https://www.billreidgallery.ca/pages/current-exhibition', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'bill-reid-current-exhibition.png' });
    
    const currentExhibitions = await page.evaluate(() => {
      const content = document.querySelector('#page-content');
      
      // Check main content areas
      const pageData = {
        title: document.title,
        content: content ? content.innerHTML : 'No page content found',
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).map(h => ({
          type: h.tagName,
          text: h.textContent.trim()
        })),
        mainContentSelectors: [
          '.main-content',
          '.page-content',
          '.content',
          'article',
          '.exhibition',
          '.exhibition-content'
        ].map(selector => {
          const element = document.querySelector(selector);
          return {
            selector,
            exists: !!element,
            content: element ? element.textContent.substring(0, 200) : null
          };
        }),
        imageData: Array.from(document.querySelectorAll('img')).slice(0, 5).map(img => ({
          src: img.src,
          alt: img.alt,
          className: img.className
        }))
      };
      
      return pageData;
    });
    
    console.log('Current Exhibition Page Analysis:');
    console.log(JSON.stringify(currentExhibitions, null, 2));
    
    // Check exhibitions list page
    console.log('\\nNavigating to exhibitions list page...');
    await page.goto('https://www.billreidgallery.ca/blogs/exhibitions-page', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'bill-reid-exhibitions-page.png' });
    
    const exhibitionsPage = await page.evaluate(() => {
      // Check for various blog/exhibition list structures
      const listData = {
        articles: Array.from(document.querySelectorAll('article, .article, .blog-post, .blog-item')).map(article => ({
          title: article.querySelector('h1, h2, h3, h4, .title')?.textContent.trim(),
          content: article.textContent.substring(0, 200).trim(),
          link: article.querySelector('a')?.href
        })),
        blogItems: Array.from(document.querySelectorAll('.blog-grid-item, .grid-item, .grid__item')).map(item => ({
          title: item.querySelector('h1, h2, h3, h4, .title')?.textContent.trim(),
          content: item.textContent.substring(0, 200).trim(),
          link: item.querySelector('a')?.href
        })),
        allHeadings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => ({
          type: h.tagName,
          text: h.textContent.trim(),
          hasLink: !!h.querySelector('a'),
          linkHref: h.querySelector('a')?.href
        })),
        allLinks: Array.from(document.querySelectorAll('a[href*="exhibition"]')).map(link => ({
          href: link.href,
          text: link.textContent.trim()
        }))
      };
      
      return listData;
    });
    
    console.log('Exhibitions Page Analysis:');
    console.log(JSON.stringify(exhibitionsPage, null, 2));
    
    // Save HTML of main pages for analysis
    const currentExhibitionHTML = await page.content();
    fs.writeFileSync('bill-reid-current-exhibition.html', currentExhibitionHTML);
    console.log('Saved current exhibition HTML for analysis');
    
    console.log('Checking for exhibition details on homepage...');
    await page.goto('https://www.billreidgallery.ca/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'bill-reid-homepage.png' });
    
    const homepageExhibitions = await page.evaluate(() => {
      return {
        exhibitionLinks: Array.from(document.querySelectorAll('a[href*="exhibition"]')).map(link => ({
          href: link.href,
          text: link.textContent.trim()
        })),
        featuredContent: Array.from(document.querySelectorAll('.featured, .highlight, .highlight-box, .featured-exhibition')).map(feature => ({
          title: feature.querySelector('h1, h2, h3, h4, .title')?.textContent.trim(),
          content: feature.textContent.substring(0, 200).trim(),
          links: Array.from(feature.querySelectorAll('a')).map(a => ({ href: a.href, text: a.textContent.trim() }))
        }))
      };
    });
    
    console.log('Homepage Exhibition Analysis:');
    console.log(JSON.stringify(homepageExhibitions, null, 2));
    
    await browser.close();
    console.log('Analysis complete');
  } catch (error) {
    console.error('Error during analysis:', error);
    await browser.close();
  }
}

analyzeGalleryPage().catch(console.error);
