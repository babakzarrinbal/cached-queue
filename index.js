var exp = {
  worker: null,
  threads: 0,
  timeout: 0,
  retry: 0,
  retrydelay: 0,
  cachetime: 0,
  cachelength: 0,
  inqueue: [],
  processing: [],
  resolved: []
};
var clearresolvedtimout = () => {
  if (exp.cachetime && exp.resolved.length)
    exp.resolved = exp.resolved.filter(
      r => r.time + exp.cachetime <= Date.now()
    );
};
exp.push = function(...input) {
  let inputid = JSON.stringify(input);

  // check previous queues for this inputid
  let prev;
  let checkqs = ["processing", "inqueue"];
  if (exp.cachetime || exp.cachelength) {
    clearresolvedtimout();
    checkqs.unshift("resolved");
  }
  for (let q of checkqs) {
    prev = exp[q].find(itm => itm.inputid == inputid);
    if (prev) {
      prev.used++;
      return prev.result;
    }
  }

  // define new task
  let resolve, reject;
  let result = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  exp.inqueue.push({
    input,
    inputid,
    result,
    resolve,
    reject,
    time: Date.now(),
    retry: 0,
    used: 0
  });
  tick();
  return result;
};

var tick = async function() {
  if (
    !exp.inqueue.length ||
    (exp.threads && exp.processing.length == exp.threads)
  )
    return;

  let result,
    error,
    newjob = exp.inqueue.shift();
  exp.processing.push(newjob);
  if (exp.timeout) {
    let pres = await Promise.race([
      new Promise(async res => {
        let r, e;
        try {
          r = await exp.worker(...newjob.input);
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
      result = await exp.worker(...newjob.input);
    } catch (e) {
      error = e;
    }
  }

  let donejob = exp.processing.find(p => p.inputid == newjob.inputid);
  exp.processing = exp.processing.filter(pj => pj.inputid != donejob.inputid);
  if (error) {
    if (exp.retry && exp.retry > newjob.retry) {
      newjob.retry++;
      return setTimeout(() => {
        exp.inqueue.push(newjob);
        tick();
      }, exp.retrydelay || 0);
    } else {
      newjob.reject(error);
    }
  } else {
    newjob.resolve(result);
  }

  clearresolvedtimout();

  if (exp.cachelength) {
    if (exp.resolved.length >= exp.cachelength) {
      exp.resolved.sort((a, b) => (a.used > b.used ? 1 : -1));
      exp.resolved.pop();
      exp.resolved.unshift(donejob);
    }
  }
  tick();
};

module.exports = exp;
