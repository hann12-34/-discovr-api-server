/**
 * Debug script to investigate Montreal website structures
 */

const puppeteer = require('puppeteer');

async function debugSite(name, url) {
    console.log(`\n🔍 Debugging ${name}: ${url}`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
        
        page.setDefaultNavigationTimeout(15000);
        
        const response = await page.goto(url, { waitUntil: 'networkidle2' });
        console.log(`✅ Status: ${response.status()}`);
        
        // Get page title
        const title = await page.title();
        console.log(`📄 Title: ${title}`);
        
        // Check for common event containers
        const containers = await page.evaluate(() => {
            const selectors = [
                '.event', '.events', '.evenement', '.evenements',
                '.show', '.shows', '.spectacle', '.spectacles',
                '.concert', '.concerts', '.party', '.parties',
                '.soiree', '.soirees', '.night', '.nights',
                '.listing', '.listings', '.card', '.cards',
                'article', '.item', '.items',
                '[class*="event"]', '[class*="show"]', '[class*="concert"]'
            ];
            
            const results = {};
            for (const selector of selectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        results[selector] = {
                            count: elements.length,
                            sample: elements[0] ? {
                                tagName: elements[0].tagName,
                                className: elements[0].className,
                                textContent: elements[0].textContent.substring(0, 200)
                            } : null
                        };
                    }
                } catch (e) {
                    // Skip invalid selectors
                }
            }
            return results;
        });
        
        console.log('📦 Found containers:');
        Object.entries(containers).forEach(([selector, info]) => {
            console.log(`   ${selector}: ${info.count} elements`);
            if (info.sample) {
                console.log(`      Sample: <${info.sample.tagName} class="${info.sample.className}">`);
                console.log(`      Text: ${info.sample.textContent.trim().substring(0, 100)}...`);
            }
        });
        
        // Check for date elements
        const dateElements = await page.evaluate(() => {
            const dateSelectors = [
                '.date', '.dates', '.datetime', '.time',
                '.when', '.quand', '.calendar', '.calendrier',
                '[class*="date"]', '[class*="time"]', '[class*="when"]'
            ];
            
            const results = {};
            for (const selector of dateSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        results[selector] = {
                            count: elements.length,
                            sample: elements[0] ? elements[0].textContent.substring(0, 100) : null
                        };
                    }
                } catch (e) {
                    // Skip invalid selectors
                }
            }
            return results;
        });
        
        console.log('📅 Found date elements:');
        Object.entries(dateElements).forEach(([selector, info]) => {
            console.log(`   ${selector}: ${info.count} elements`);
            if (info.sample) {
                console.log(`      Sample text: ${info.sample.trim()}`);
            }
        });
        
        // Check page structure
        const structure = await page.evaluate(() => {
            const body = document.body;
            if (!body) return 'No body found';
            
            // Get main content areas
            const mainAreas = [];
            const mainSelectors = ['main', '#main', '.main', '#content', '.content', '.container'];
            
            for (const selector of mainSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    mainAreas.push({
                        selector,
                        tagName: el.tagName,
                        className: el.className,
                        childCount: el.children.length
                    });
                }
            }
            
            return {
                bodyClasses: body.className,
                bodyChildCount: body.children.length,
                mainAreas,
                hasReact: !!window.React || !!document.querySelector('[data-reactroot]'),
                hasVue: !!window.Vue || !!document.querySelector('[data-v-]'),
                hasAngular: !!window.angular || !!document.querySelector('[ng-app]'),
                scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).slice(0, 5)
            };
        });
        
        console.log('🏗️ Page structure:');
        console.log(`   Body classes: ${structure.bodyClasses}`);
        console.log(`   Body children: ${structure.bodyChildCount}`);
        console.log(`   Has React: ${structure.hasReact}`);
        console.log(`   Has Vue: ${structure.hasVue}`);
        console.log(`   Has Angular: ${structure.hasAngular}`);
        
        if (structure.mainAreas.length > 0) {
            console.log('   Main areas:');
            structure.mainAreas.forEach(area => {
                console.log(`      ${area.selector}: <${area.tagName} class="${area.className}"> (${area.childCount} children)`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function debugAllSites() {
    const sites = [
        { name: 'MTL.org Events', url: 'https://www.mtl.org/en/what-to-do/events' },
        { name: 'Le Point de Vente', url: 'https://lepointdevente.com/billets/montreal' },
        { name: 'Foufounes Électriques', url: 'https://www.foufouneselectriques.com/events/' }
    ];
    
    console.log('🇨🇦 Debugging Montreal Event Sites...');
    
    for (const site of sites) {
        await debugSite(site.name, site.url);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between requests
    }
}

// Run the debug
if (require.main === module) {
    debugAllSites()
        .then(() => {
            console.log('\n🎉 Debug completed!');
        })
        .catch(error => {
            console.error('Debug error:', error);
        });
}
