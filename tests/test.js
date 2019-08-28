var q = require("../index.js");
q.worker = async function(a, timout) {
  await new Promise(res => setTimeout(res, timout));
  return a;
};

q.options = {
  threads: 3, // simultanious threads to be run (zero = unlimited)
  timeout: 0, // if set after this amout if not retured result will reject (zero = unlimited)
  retry: 0, // retries in case of rejection (zero = no retry)
  retrydelay: 0, // delay between retries (zero = no retry)
  cachetime: 5000, // time to cache result (zero = unlimited)
  cachelength: 0 // length of cached results(zero = unlimited)
};
var te = Date.now();
setInterval(() => {
  console.log(Math.round((Date.now() - te) / 1000));
  console.log(q.inqueue.map(q => q.inputid).join("-"));
  console.log(q.processing.map(q => q.inputid).join("-"));
  console.log(q.resolved.map(q => q.inputid).join("-"));
  console.log("---------------------");
}, 1000);
for (let i = 0; i < 20; i++) {
  q.push((i % 3) + 1, ((i % 4) + 1) * 1000);
}
