# cached queue

simple queue system inspired from async queue
this package features caching of result and retry if failed options

## Installation

```bash
npm install cached-queue
```

## Usage

```javaScript

var q = require('cached-queue');

q.worker: function(input,...){}  // your worker function can be async or return promise
// the following is the defaults
q.threads: 0,           // simultanious threads to be run (zero = unlimited)
q.timeout: 0,           // if set after this amout if not retured result will reject (zero = unlimited)
q.retry: 0,             // retries in case of rejection (zero = no retry)
q.retrydelay: 0,        // delay between retries (zero = no retry)
q.cachetime: 0,         // time to cache result (zero = unlimited)
q.cachelength: 0        // length of cached results(zero = unlimited)
};

q.push(input1,input2,...) // returnes a promise you can use with await or then

```
