var q = require("./index");
q.options = {
  threads: 2
};
q.worker = (a, b) =>
  new Promise(resolve =>
    setTimeout(() => {
      resolve(a);
    }, b)
  );
let t = Date.now();
for (let i = 0; i < 10; i++) {
  q.push(i, 4000).then(res => {
    console.log(Math.round((Date.now() - t) / 1000), res);
  });
}
