# cached queue

simple queue system inspired from async queue
this package features caching of result and retry if failed options

## Installation

```bash
npm install cached-queue
```

## Usage

```javaScript

var q = require('cached-queue')();

q.worker= function(input1,input2,...){}  // your worker function whatever it is
// the following is the defaults
q.options={
    threads: 0,           // simultanious threads to be run (zero = unlimited)
    timeout: 0,           // if set after this amout if not retured result will reject (zero = unlimited)
    retry: 0,             // retries in case of rejection (zero = no retry)
    retrydelay: 0,        // delay between retries (zero = no retry)
    cachetime: 0,         // time to cache result (zero = unlimited)
    cachelength: 0        // length of cached results(zero = unlimited)
}
q.inqueue // is the array of queued jobs
q.processing // is the array of currently processing  jobs
q.resolved // is the array of resolved and cached jobs


//or
q = require('cached-queue')(function(){},options));
q.push(input1,input2,...) // returnes a promise you can use with await or then

```
