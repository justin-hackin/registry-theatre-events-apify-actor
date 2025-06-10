// For more information, see https://docs.apify.com/sdk/js
import {Actor} from 'apify';
// For more information, see https://crawlee.dev
import {PlaywrightCrawler} from 'crawlee';
// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
import {items, router} from './routes.js';

// Initialize the Apify SDK
await Actor.init();

// Structure of input is defined in input_schema.json

const proxyConfiguration = await Actor.createProxyConfiguration();

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
    launchContext: {
        launchOptions: {
            args: [
                '--disable-gpu', // Mitigates the "crashing GPU process" issue in Docker containers
            ],
        },
    },
});

await crawler.run(['https://registrytheatre.com/events/']);

if (process.env.APIFY_IS_AT_HOME !== "1") {
    await fetch(
        "http://localhost:3000/api/apify-run-succeeded?token=a77ebd71b0a80c77e0f4717a17ea0ca681f15b05ed4674b87808a34f58ea2ddd",
        {
            method: "POST",
            body: JSON.stringify({
                scraperEventType: 'registry-theatre',
                events: {all: items},
            }),
        },
    );
}

// Exit successfully
await Actor.exit();
