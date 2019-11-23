const { TwoWayBus } = require('../dist/TwoWayBus');

module.exports = [
  ok => {
    const source = new TwoWayBus();
    const filter = new TwoWayBus();
    filter.relayOn(source, 'relay');
    filter.on('relay', ok);
    source.emit('relay');
  },
  (ok, error) => {
    const source = new TwoWayBus();
    const filter = new TwoWayBus();
    filter.relayOn(source, 'relay');
    filter.on('source-only', error);
    source.emit('source-only');
    setTimeout(ok, 25);
  },
  (ok, error) => {
    const source = new TwoWayBus();
    const filter = new TwoWayBus();
    filter.relayOn(source, 'relay', 'source-only');
    filter.relayOff(source, 'source-only');
    filter.on('relay', ok);
    filter.on('source-only', error);
    source.emit('source-only');
    setTimeout(() => source.emit('relay'), 25);
  },
  async (ok, error, assert) => {
    const source = new TwoWayBus();
    const filter = new TwoWayBus();
    filter.relayOn(source, 'roll-call');
    filter.on('roll-call', () => 'John');
    source.on('roll-call', () => 'Jane');

    const results = await source.all('roll-call');
    assert(results.sort().join(',') === 'Jane,John');
  },
  async (ok, error, assert) => {
    const source = new TwoWayBus();
    const filter = new TwoWayBus();
    const data = 'TEST_DATA';
    filter.relayOn(source, 'relay');
    filter.on('relay', e =>
      assert(e.type === 'relay' && e.mode === 'emit' && e.data === data),
    );
    source.emit('relay', data);
  },
];
