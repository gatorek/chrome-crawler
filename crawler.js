var Crawler = require("simplecrawler");
const CDP = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');


var crawler = new Crawler("http://URL/");
crawler.interval = 100; // Ten seconds 
crawler.maxConcurrency = 10;
crawler.maxDepth = 2; // First page and discovered links from it are fetched 
crawler.downloadUnsupported = false;

var debugPort = 9222;
var gChrome;

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
    if (/^text\/html/.test(response.headers['content-type'])) {
        launchChrome().then(chrome => {
            CDP({ port: chrome.port }, (client) => {
                // extract domains
                const { Network, Page } = client;
                // setup handlers
                Network.requestWillBeSent((params) => {
                    console.log('URL: ' + queueItem.url + " | " + params.request.url);
                });
                Page.loadEventFired(() => {
                    client.close();
                });
                // enable events then start!
                Promise.all([
                    Network.enable(),
                    Page.enable()
                ]).then(() => {
                    return Page.navigate({ url: queueItem.url });
                }).catch((err) => {
                    console.error(err);
                    client.close();
                });
            }).on('error', (err) => {
                // cannot connect to the remote endpoint
                console.error(err);
            }).on('complete', function() {
                console.log('CRAWL complete');
                chrome.kill();
            });
        }).then(chrome => {
            console.log('CRAWL complete');
            chrome.kill();
        });
    }
});

function launchChrome(headless = true) {
    return chromeLauncher.launch({
        // port: 9222, // Uncomment to force a specific port of your choice.
        chromeFlags: [
            '--window-size=412,732',
            '--disable-gpu',
            headless ? '--headless' : ''
        ]
    });
}

crawler.start();

// launchChrome().then(chrome => {
//   console.log(`Chrome debuggable on port: ${chrome.port}`);
//   debugPort = chrome.port;
//   gChrome = chrome;
//   crawler.start();
// });