const ALL_SUITES = ['emit', 'all', 'race'];

const suites = process.argv.slice(2);
const toRun =
  suites.length === 0
    ? ALL_SUITES
    : ALL_SUITES.filter(suite => suites.includes(suite));

function run(execute, i) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      console.log(i, 'timed out');
      resolve(false);
    }, 100);
    const ok = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const error = () => {
      console.log(i, 'failed');
      clearTimeout(timer);
      resolve(false);
    };
    const assert = condition => (condition ? ok() : error());

    execute(ok, error, assert);
  });
}

(async function() {
  let pass = [];
  let fail = [];
  for (const name of toRun) {
    console.log('Running:', name);
    const suite = require(`./${name}`);
    const results = await Promise.all(suite.map(run));
    const bucket = results.every(Boolean) ? pass : fail;
    bucket.push(name);
  }

  console.log(`\n\n--- Ran ${toRun.length} suites`);
  console.log(`Passed: ${pass.join(', ') || '[none]'}`);
  console.log(`Failed: ${fail.join(', ') || '[none]'}`);
})();
