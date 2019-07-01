const path = require('path');
const fs = require('fs');
const { parentPort, workerData, isMainThread } = require('worker_threads');

(async () => {
  if (isMainThread) {
    return;
  }
  try {
    let modulePath = path.resolve(__dirname, workerData.path);
    if (!fs.existsSync(`${modulePath}.js`)) {
      modulePath += '.ts';
      require('ts-node').register({
        transpileOnly: true,
      });
    }
    const mod = require(modulePath);
    await mod[workerData.method](workerData.data);
  } catch (e) {
    parentPort.postMessage({error: e.message});
  }
})();

