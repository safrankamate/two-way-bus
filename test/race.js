const { TwoWayBus } = require('../dist/TwoWayBus');

module.exports = [
  async (ok, error, assert) => {
    const bus = new TwoWayBus();
    bus.on('test-race', () => delay(50, 'one'));
    bus.on('test-race', () => delay(10, 'two'));
    bus.on('test-race', () => delay(30, 'three'));

    const result = await bus.race('test-race');
    assert(result === 'two');
  },
  async (ok, error, assert) => {
    const bus = new TwoWayBus();
    const removed = () => delay(10, 'two');
    bus.on('test-race', () => delay(50, 'one'));
    bus.on('test-race', removed);
    bus.on('test-race', () => delay(30, 'three'));
    bus.off('test-race', removed);

    const result = await bus.race('test-race');
    assert(result === 'three');
  },
  async (ok, error, assert) => {
    const bus = new TwoWayBus();
    const eventData = 'TEST_DATA';
    bus.on('test-race', e => {
      assert(
        e.type === 'test-race' && e.mode === 'race' && e.data === eventData,
      );
      return null;
    });
    bus.race('test-race', eventData);
  },
];

function delay(ms, value) {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), ms);
  });
}
