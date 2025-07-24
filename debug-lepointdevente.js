/**
 * Debug Le Point de Vente specifically
 */

const puppeteer = require('puppeteer');

async function debugLePointDeVente() {
    console.log('🔍 Debugging Le Point de Vente structure...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
        
        page.setDefaultNavigationTimeout(15000);
        
        await page.goto('https://lepointdevente.com/billets/montreal', { waitUntil: 'networkidle2' });
        
        // Get detailed structure of .item elements
        const itemAnalysis = await page.evaluate(() => {
            const items = document.querySelectorAll('.item');
            console.log(`Found ${items.length} .item elements`);
            
            const results = [];
            
            for (let i = 0; i < Math.min(items.length, 10); i++) {
                const item = items[i];
                
                // Get all text content
                const text = item.textContent.trim();
                
                // Look for potential titles
                const titles = [];
                const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.name', 'a[title]'];
                titleSelectors.forEach(selector => {
                    const titleEl = item.querySelector(selector);
                    if (titleEl && titleEl.textContent.trim()) {
                        titles.push({
                            selector,
                            text: titleEl.textContent.trim()
                        });
                    }
                });
                
                // Look for dates
                const dates = [];
                const dateSelectors = ['.date', '.datetime', '.time', '[class*="date"]', '[class*="time"]'];
                dateSelectors.forEach(selector => {
                    const dateEl = item.querySelector(selector);
                    if (dateEl && dateEl.textContent.trim()) {
                        dates.push({
                            selector,
                            text: dateEl.textContent.trim()
                        });
                    }
                });
                
                // Look for links
                const links = [];
                const linkElements = item.querySelectorAll('a[href]');
                linkElements.forEach(link => {
                    if (link.href && !link.href.includes('#')) {
                        links.push({
                            href: link.href,
                            text: link.textContent.trim().substring(0, 100)
                        });
                    }
                });
                
                // Look for images
                const images = [];
                const imgElements = item.querySelectorAll('img[src]');
                imgElements.forEach(img => {
                    if (img.src) {
                        images.push(img.src);
                    }
                });
                
                results.push({
                    index: i,
                    tagName: item.tagName,
                    className: item.className,
                    id: item.id,
                    textLength: text.length,
                    textSample: text.substring(0, 200),
                    titles,
                    dates,
                    links: links.slice(0, 3),
                    images: images.slice(0, 2),
                    childCount: item.children.length
                });
            }
            
            return results;
        });
        
        console.log(`\n📦 Analysis of .item elements (${itemAnalysis.length} analyzed):`);
        
        itemAnalysis.forEach(item => {
            console.log(`\n--- Item ${item.index + 1} ---`);
            console.log(`Tag: <${item.tagName} class="${item.className}" id="${item.id}">`);
            console.log(`Children: ${item.childCount}, Text length: ${item.textLength}`);
            console.log(`Text sample: "${item.textSample}"`);
            
            if (item.titles.length > 0) {
                console.log(`Titles found:`);
                item.titles.forEach(title => {
                    console.log(`   ${title.selector}: "${title.text}"`);
                });
            }
            
            if (item.dates.length > 0) {
                console.log(`Dates found:`);
                item.dates.forEach(date => {
                    console.log(`   ${date.selector}: "${date.text}"`);
                });
            }
            
            if (item.links.length > 0) {
                console.log(`Links found:`);
                item.links.forEach(link => {
                    console.log(`   "${link.text}" -> ${link.href}`);
                });
            }
            
            if (item.images.length > 0) {
                console.log(`Images found:`);
                item.images.forEach(img => {
                    console.log(`   ${img}`);
                });
            }
        });
        
        // Check if page is dynamically loaded
        const pageInfo = await page.evaluate(() => {
            return {
                readyState: document.readyState,
                hasJavaScript: !!window.jQuery || !!window.$ || !!window.Vue || !!window.React,
                bodyHTML: document.body.innerHTML.substring(0, 500),
                scripts: Array.from(document.querySelectorAll('script[src]')).length
            };
        });
        
        console.log(`\n📄 Page Info:`);
        console.log(`Ready state: ${pageInfo.readyState}`);
        console.log(`Has JS frameworks: ${pageInfo.hasJavaScript}`);
        console.log(`Scripts: ${pageInfo.scripts}`);
        console.log(`Body HTML sample: ${pageInfo.bodyHTML}...`);
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the debug
if (require.main === module) {
    debugLePointDeVente()
        .then(() => {
            console.log('\n🎉 Le Point de Vente debug completed!');
        })
        .catch(error => {
            console.error('Debug error:', error);
        });
}
