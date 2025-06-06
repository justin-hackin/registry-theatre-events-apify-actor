## PlaywrightCrawler template

 An [Apify Actor](https://apify.com/actors) using `PlaywrightCrawler` with Crawlee to scrape the events from [The Registry Theatre](https://registrytheatre.com/) website.

The event dataset items are in the following shape:
```
{
    id: string; // a `-` delimited concatenation of the pathname parts following /events/
    name: string;
    start: string; // ISO date string
    description: string;
    url: string;
    imgUrl: string;
}
```

Unfortunately the end time is not available from the list nor from details page. The end time could be extracted from ICS data the site provides but this was not deemed important enough given that their events don't vary largely in duration.

Scraping this site provided some unique challenges. There may or may not be a subtitle for the event which is difficult to discern from other content so it was abandoned as a target for scraping. The description text is not neatly contained within a targetable element. Instead it exists inside what appears to be freeform CMS content which may contain a bunch of generic info about an event series. Furthermore, the action button that denotes the end of the description is not always a buy button for tickets. In the case of a series, it was instead a different kind of button to another ticket vending site. These site features make this scraper brittle, use with your own caution.

It's rare that venues will provide a calendar subscription to their events so kudos to The Registry Theatre for doing so. However, the descriptions were mangled with long blocks of carriage returns and some of the content was cut off or inappropriately present in the description so this was created in order to capture the information more cleanly.
