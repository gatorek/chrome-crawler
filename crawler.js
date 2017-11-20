var Crawler = require("simplecrawler")
const CDP = require('chrome-remote-interface')
const chromeLauncher = require('chrome-launcher')
const commandLineArgs = require('command-line-args')
var __ = require('underscore')
var kue = require('kue'),
    queue = kue.createQueue()

const optionDefinitions = [
  { name: 'max-depth', alias: 'd', type: Number, defaultValue: 1 },
  { name: 'max-concurrency', alias: 'c', type: Number, defaultValue: 10 },
  { name: 'max-chrome-concurrency', alias: 'g', type: Number, defaultValue: 10 },
  { name: 'time-interval', alias: 't', type: Number, defaultValue: 100 },
  { name: 'help', alias: 'h', type: Boolean },
  { name: 'url', alias: 'u', type: String}
]
const options = commandLineArgs(optionDefinitions)
if(options.help || ! /^(http|https):\/\/[a-zA-Z0-9]+\.[a-zA-Z0-9]+/.test(options.url) ) {
    console.error(`Usage: node crawler.js -u URL [options]
    -u, --url                     url
    -d, --max-depth               recursion level
    -c, --max-concurrency         crawler concurrency
    -g, --max-chrome-concurrency  browser concurrency
    -t, --time-interval           crawler time interval
    -h, --help                    this help
    `)
    process.exit(0)
}

// Setup crawler
var crawler = new Crawler(options.url)
crawler.interval = options["time-interval"]
crawler.maxConcurrency = options["max-concurrency"]
crawler.maxDepth = options["max-depth"]
crawler.downloadUnsupported = false
crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
    if (/^text\/html/.test(response.headers['content-type'])) {
        console.log('CRAWL: ' + queueItem.url)
		try {
		    queue.create('url', {url: queueItem.url}).removeOnComplete(true).save()
		}
		catch (err) {
			console.error(err); 
			console.error('ERR QUEUE: ' + queueItem.url )
		}
    }
})

function launchChrome(headless = true) {
    return chromeLauncher.launch({
        chromeFlags: [
            '--window-size=412,732',
            '--disable-gpu',
            headless ? '--headless' : ''
        ]
    })
}

crawler.start()

// Start workers
__.times(options["max-chrome-concurrency"], chromeId => {
    launchChrome().then(chrome => {
        queue.process('url', (job, done) => {
            CDP({ port: chrome.port }, (client) => {
                // extract domains 
                const { Network, Page } = client
                // setup handlers
                Network.requestWillBeSent((params) => {
                    console.log('URL: ' + job.data.url + " | " + params.request.url)
                })
                Page.loadEventFired(() => {
                    client.close()
                    done()
                })
                // enable events then start!
                Promise.all([
                    Network.enable(),
                    Page.enable()
                ]).then(() => {
                    console.log('NAV: browser: ' + chromeId + ' url: ' + job.data.url)
                    return Page.navigate({ url: job.data.url })
                }).catch((err) => {
                    console.error('Error in browser: ' + chromeId + ', URL: ' + job.data.url)
                    console.error(err)
                    client.close()
                })
            }).on('error', (err) => {
                console.error('Error in browser: ' + chromeId + ', URL: ' + job.data.url)
                console.error(err)
            })
        })
    })
})
