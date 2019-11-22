const { TwoWayBus } = require('../dist/TwoWayBus');

module.exports = [
  ok => {
    const bus = new TwoWayBus();
    bus.on('test', ok);
    bus.emit('test');
  },
  (ok, error) => {
    const bus = new TwoWayBus();
    bus.on('test', error);
    bus.on('test', ok);
    bus.off('test', error);
    bus.emit('test');
  },
  (ok, error, assert) => {
    const bus = new TwoWayBus();
    const eventData = 'TEST_DATA';
    bus.on('test', e => {
      assert(e.type === 'test' && e.mode === 'emit' && e.data === eventData);
    });
    bus.emit('test', eventData);
  },
];
