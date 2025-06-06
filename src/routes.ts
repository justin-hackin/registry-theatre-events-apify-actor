/* eslint-disable @typescript-eslint/no-shadow */
import * as chrono from 'chrono-node';
import { createPlaywrightRouter, Dataset } from 'crawlee';
import { startCase } from 'lodash-es';

export const router = createPlaywrightRouter();
const dateTimeSel = 'h2.tribe-events-schedule__datetime';

router.addDefaultHandler(async ({ enqueueLinks, request, page, log }) => {
    const title = await page.title();
    log.info(`LIST: ${request.loadedUrl} is '${title}'`);
    const articleList = page.getByLabel('List of Events').getByRole('article');

    const detailsUrls = await articleList.evaluateAll((articles) => {
        return articles.map((article) => {
            return article
                .querySelector('a.tribe-events-calendar-list__event-title-link')
                ?.getAttribute('href') as string;
        });
    });

    const next = page.getByLabel('Next Events').first();
    const hasNext = await next.isEnabled();
    if (hasNext) {
        const nextUrl = await next.getAttribute('href');
        if (nextUrl === null ) {
            throw new Error('No event found for this route');
        }
        // Extract links from the current page and add them to the crawling queue.
        await enqueueLinks({
            urls: [nextUrl],
        });
    }
    await enqueueLinks({
        urls: detailsUrls,
        label: 'details',
    });
});

router.addHandler('details', async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`DETAILS: ${request.loadedUrl} is '${title}'`);
    const main = page.getByRole('main');
    const name =
        (await main.evaluate((el) => {
            return el.querySelector('h1.tribe-events-single-event-title')?.textContent;
        }));
    if (!name) {
        throw new Error('Could not find event name');
    }

    const { siblingStartIsDiv, dateTime } = await main.evaluate((el, dateTimeSel) => {
        const dateTimeH2 = el.querySelector(dateTimeSel);
        if (dateTimeH2 === null) {
            throw new Error(`Could not find date/time el`);
        }
        const siblingStartIsDiv = !!dateTimeH2.parentElement?.classList.contains('tribe-events-schedule');

        const end = dateTimeH2.querySelector('.tribe-events-schedule__date--end');
        if (end) {
            throw new Error(`Unexpected end date`);
        }

        const date = dateTimeH2.querySelector('.tribe-events-schedule__date--start')?.textContent?.trim();
        if (!date) {
            throw new Error(`No date`);
        }
        const time = dateTimeH2.querySelector('.tribe-events-schedule__time--start')?.textContent?.trim();

        if (!date) {
            throw new Error(`No time`);
        }
        return { siblingStartIsDiv, dateTime: `${date} @ ${time}` };
    }, dateTimeSel);

    const chronoResults = chrono.parse(dateTime);
    const dateTimeISO = chronoResults[0].start.date().toISOString();

    const description = await page.getByRole('main').evaluate((el, siblingStartIsDiv) => {
        const siblingStartSel = siblingStartIsDiv ? 'div.tribe-events-schedule' : dateTimeSel;
        const afterDescriptionButton =
            window.document.querySelector('div.tribe-block') ?? document.querySelector('div.wp-block-buttons');
        if (!afterDescriptionButton) {
            throw new Error(`Could not find buy button`);
        }

        return Array.from(el.querySelectorAll(`${siblingStartSel} ~ p`))
            .filter((par) => {
                if (par.contains(afterDescriptionButton) || afterDescriptionButton.contains(par)) {
                    return undefined; // not before or after, it's a parent child relationship.
                }

                let tmp = par.previousElementSibling || par.parentElement;

                while (tmp) {
                    if (tmp === afterDescriptionButton || tmp.contains(afterDescriptionButton)) {
                        return true;
                    }
                    tmp = tmp.previousElementSibling || tmp.parentElement;
                }

                return false; // if it is not before, it must be after.
            })
            .map((par) => {
                return Array.from(par.childNodes)
                    .filter((child) => {
                        return child.textContent?.trim() !== '';
                    })
                    .map((child) => {
                        return child.textContent;
                    })
                    .join('\n');
            })
            .filter((txt) => {
                return txt !== 'Also taking place:';
            })
            .join('\n\n');
    }, siblingStartIsDiv);
    const thisUrl = new URL(request.url);

    const id = thisUrl.pathname.split('/').slice(2, -1).join('-');
    const imgUrl = await main.evaluate((el) => {
        return el.querySelector('figure > img').getAttribute('src');
    });
    const pageData = {
        id,
        name: startCase(name),
        start: dateTimeISO,
        description,
        url: request.url,
        imgUrl,
    };
    await Dataset.pushData(pageData);
});
