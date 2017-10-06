# Chrome based web crawler #

Web crawler using Chrome headless mode and chrome remote debug. Loggs all requests to stdout.

### Prerequisities ###

* Node and nmp
* Chrome, version at least 60
* Redis server running locally on standard port, without password

### Set up ###

* Download, using `git clone https://bitbucket.org/gatorek/chrome-crawler.git ./` or got to Download section of tihs repo
* Run `nmp install`, which installs all neccessary node dependencies 

### Run ###

* `node crawler js -d 100 -g 4 -u http://url.to.scan > log.txt`
* `node crawler.js --help` gives you short usage instruction

### TODO ###

* add timestamps
* add timeout option for chrome debug
* automatically set chrome concurrency level, basing on CPU cores count
* separate namespaces in redis for every instance of program
* clean queue after break (i.e. Ctrl+C)