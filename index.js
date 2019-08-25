var exp = {
  worker: null,
  threads: 0,
  timeout: 0,
  retry: 0,
  retrydelay: 0,
  cachetime: 0,
  cachelength: 0
};
var inqueue = [],
  processing = [],
  resolved = [];

exp.push = function(...input) {
  let inputid = JSON.stringify(input);
  let prev;
  if (exp.cachetime || exp.cachelength) {
    if (exp.cachetime && resolved.length)
      resolved = resolved.filter(r => r.time + exp.cachetime <= Date.now());
    prev = resolved.find(itm => itm.inputid == inputid);
    if (prev) return prev.result;
  }
  prev = processing.find(itm => itm.inputid == inputid);
  if (prev) return prev.result;

  prev = inqueue.find(itm => itm.inputid == inputid);
  if (prev) return prev.result;
  let resolve, reject;
  let result = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  inqueue = push({
    input,
    inputid,
    result,
    resolve,
    reject,
    time: Date.now(),
    retry: 0
  });
  tick();
  return result;
};

var tick = async function() {
  if (!inqueue.length || (threads && processing.length == threads)) {
    if (exp.cachetime && resolved.length)
      resolved = resolved.filter(r => r.time + exp.cachetime <= Date.now());
    return;
  }

  let result,
    error,
    newjob = inqueue.shift();
  processing.push(newjob);
  if (exp.timeout) {
    let pres = await Promise.race([
      new Promise(async res => {
        let r, e;
        try {
          r = await worker(...newjob.input);
        } catch (er) {
          e = er;
        }
        return res({ r, e });
      }),
      new Promise(async res => () =>
        setTimeout(() => res({ r: null, e: "timedout" }), exp.timeout)
      )
    ]);
    result = pres.r;
    error = pres.e;
  } else {
    try {
      result = await worker(...newjob.input);
    } catch (e) {
      error = e;
    }
  }

  let donejobindex = processing.findIndex(p => p.inputid == newjob.inputid);
  let donejob = processing[donejobindex];
  processing = donejobindex
    ? [
        ...processing.slice(0, donejobindex - 1),
        ...processing.slice(donejobindex)
      ]
    : processing.slice(1);

  if (error) {
    if (exp.retry && exp.retry > newjob.retry) {
      newjob.retry++;
      return setTimeout(() => {
        inqueue.push(newjob);
        tick();
      }, exp.retrydelay || 0);
    } else {
      newjob.reject(e);
    }
  } else {
    newjob.resolve(result);
  }

  if (exp.cachetime && resolved.length)
    resolved = resolved.filter(r => r.time + exp.cachetime <= Date.now());

  if (exp.cachelength) {
    if (resolved.length >= exp.cachelength) {
      resolved.shift();
      resolved.push(donejob);
    }
  }
  tick();
};

module.exports = exp;
