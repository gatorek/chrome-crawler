var Crawler = require("simplecrawler");
const CDP = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const commandLineArgs = require('command-line-args')

const optionDefinitions = [
  { name: 'max-depth', alias: 'd', type: Number, defaultOption: 1 },
  { name: 'max-concurrency', alias: 'c', type: Number, defaultOption: 10 },
  { name: 'time-interval', alias: 't', type: Number, defaultOption: 100 },
  { name: 'url', alias: 'u', type: String}
]
const options = commandLineArgs(optionDefinitions)
if (! /^(http|https):\/\/[a-zA-Z0-9]+\.[a-zA-Z0-9]+/.test(options.url) ){
    console.error('Option -u|--url must be set and be valid URL');
    process.exit(1);
}

console.log(options)

var crawler = new Crawler(options.url);
crawler.interval = options["time-interval"];
crawler.maxConcurrency = options["max-concurrency"];
crawler.maxDepth = options["max-depth"]; 
crawler.downloadUnsupported = false;


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
                })
            }).on('error', (err) => {
                // cannot connect to the remote endpoint
                console.error(err);
            }).on('complete', function() {
                console.log('CRAWL complete');
                chrome.kill();
            })
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