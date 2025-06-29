const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getHtml() {
    console.log('Launching Puppeteer with stealth plugin...');
        const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('Navigating to https://capturephotofest.com/calendar/');
    try {
        await page.goto('https://capturephotofest.com/calendar/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Page loaded. Getting content...');
        const content = await page.content();
        console.log(`HTML received. Length: ${content.length}`);
        console.log(content);
    } catch (error) {
        console.error('Error during Puppeteer navigation:', error.message);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

getHtml();
