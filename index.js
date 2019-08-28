module.exports = function(worker = null, options = {}) {
  var exp = {
    worker: worker,
    options: options || {
      threads: 0,
      timeout: 0,
      retry: 0,
      retrydelay: 0,
      cachetime: 0,
      cachelength: 0
    },
    inqueue: [],
    processing: [],
    resolved: []
  };

  var timeout;
  var clearresolvedtimout = () => {
    if (!exp.options.cachetime || !exp.resolved.length) return;
    exp.resolved = exp.resolved.filter(
      r => r.time + exp.options.cachetime >= Date.now()
    );
    if (timeout) clearTimeout(timeout);
    if (exp.resolved.length) timeout = setTimeout(tick, exp.options.cachetime);
  };
  exp.push = function(...input) {
    let inputid = JSON.stringify(input);

    // check previous queues for this inputid
    let prev;
    let checkqs = ["processing", "inqueue"];
    if (exp.options.cachetime || exp.options.cachelength) {
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
      retry: 0,
      used: 0
    });
    tick();
    return result;
  };

  var tick = async function() {
    if (
      !exp.inqueue.length ||
      (exp.options.threads && exp.processing.length == exp.options.threads)
    ) {
      clearresolvedtimout();
      return;
    }

    let result,
      error,
      newjob = exp.inqueue.shift();
    exp.processing.push(newjob);
    if (exp.options.timeout) {
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
          setTimeout(() => res({ r: null, e: "timedout" }), exp.options.timeout)
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
      if (exp.options.retry && exp.options.retry > newjob.retry) {
        newjob.retry++;
        return setTimeout(() => {
          exp.inqueue.push(newjob);
          tick();
        }, exp.options.retrydelay || 0);
      } else {
        newjob.reject(error);
      }
    } else {
      newjob.resolve(result);
    }

    clearresolvedtimout();

    if (exp.options.cachelength || exp.options.cachetime) {
      if (
        exp.options.cachelength &&
        exp.resolved.length >= exp.options.cachelength
      ) {
        exp.resolved.sort((a, b) => (a.used > b.used ? 1 : -1));
        exp.resolved.pop();
      }
      donejob.time = Date.now();
      exp.resolved.unshift(donejob);
    }
    tick();
  };

  return exp;
};
