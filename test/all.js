const { TwoWayBus } = require('../dist/TwoWayBus');

module.exports = [
  async (ok, error, assert) => {
    const bus = new TwoWayBus();
    bus.on('test-all', () => 'one');
    bus.on('test-all', () => 'two');
    bus.on('test-all', () => 'three');

    const results = await bus.all('test-all');
    compareResults(assert, results, ['one', 'two', 'three']);
  },
  async (ok, error, assert) => {
    const bus = new TwoWayBus();
    const removed = () => 'two';
    bus.on('test-all', () => 'one');
    bus.on('test-all', removed);
    bus.on('test-all', () => 'three');
    bus.off('test-all', removed);

    const results = await bus.all('test-all');
    compareResults(assert, results, ['one', 'three']);
  },
  async (ok, error, assert) => {
    const bus = new TwoWayBus();
    const eventData = 'TEST_DATA';
    bus.on('test-all', e => {
      assert(e.type === 'test-all' && e.mode === 'all' && e.data === eventData);
      return null;
    });
    bus.all('test-all', eventData);
  },
];

function compareResults(assert, received, expected) {
  expected.sort();
  received.sort();
  assert(received.map((value, i) => value === expected[i]).every(Boolean));
}
