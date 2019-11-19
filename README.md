# two-way-bus

Asynchronous pub/sub event bus that allows listeners to respond to events directly.

If you've done JavaScript development for a while, you've probably come across the pub/sub model. In this setup, the object known as the event bus acts as a broadcaster: objects can _subscribe_ to certain types of events by passing a callback function (also called a _listener_), so that when other objects _publish_ an event of that type on the bus, the callback function will be invoked.

This typically looks something like this:

```typescript
import { TwoWayBus } from 'two-way-bus';

const bus = new TwoWayBus();

const listener = function() {
  console.log('my-event has been triggered!');
};

// Subscribe:
bus.on('my-event', listener);

// Publish (also called "emit"):
bus.emit('my-event');

// Output: "my-event has been triggered!"
```

The limitation of event buses is that they only offer one-way communication. The code that publishes an event has no way of knowing how that event was handled, if at all. If objects need to communicate back and forth, we need to define two separate events (one for the outgoing message, one for the response).

**TwoWayBus** was designed to solve this problem by allowing subscribers to return a result directly from their listener function, which will be passed to the code that published the triggering event.

The `TwoWayBus` class implements a familiar interface: `on` and `off` for subscribing/unsubscribing, and `emit` for publishing traditional one-way events.

Besides that, however, it also has the methods `all` and `race`. These names may be familiar from the `Promise` class, and they indeed work the same way. Both of them invoke all listeners that are subscribed to the given event, and return a `Promise`.

- In the case of `all`, this `Promise` resolves to an array containing the responses gathered from all listeners.
- In the case of `race`, it resolves to the result from the listener that first returns.

Here are some simple examples of each use:

## `all()`

```typescript
import { TwoWayBus } from 'two-way-bus';

const bus = new TwoWayBus();

bus.on('roll-call', () => 'Johnny');
bus.on('roll-call', () => 'Jane');
bus.on('roll-call', () => 'Jackie');

async function rollCall() {
  // Use .all() to collect responses from all listeners:
  const names = await bus.all('roll-call');
  console.log(names);
}

rollCall();
// Output: [ "Johnny", "Jane", "Jackie" ]
```

## `race()`

```typescript
import { TwoWayBus } from 'two-way-bus';

const bus = new TwoWayBus();

// Wait 3 seconds before bidding
bus.on(
  'bid',
  () =>
    new Promise(resolve => {
      setTimeout(() => resolve('John'), 3000);
    }),
);

// Wait 1 second before bidding
bus.on(
  'bid',
  () =>
    new Promise(resolve => {
      setTimeout(() => resolve('Jane'), 1000);
    }),
);

// Wait 5 seconds before bidding
bus.on(
  'bid',
  () =>
    new Promise(resolve => {
      setTimeout(() => resolve('Jackie'), 5000);
    }),
);

async function auction() {
  // Use .race() to grab the response from the quickest listener:
  const first = await bus.race('bid');
  console.log(first);
}

auction();
// Output: "Jane"
```

In essence, `TwoWayBus` can allow any number of objects to cooperate and share data, without needing to hold references to each other or even knowing each other's interfaces. This can help greatly in separating concerns, and preventing complicated mutual dependencies.

# API Reference

**`class TwoWayEvent`**

- `readonly type: string`
- `readonly mode: 'emit' | 'all' | 'race'`
- `readonly data: any`

**`type Listener = (event: TwoWayEvent) => any | Promise<any>`**

**`class EventBus`**

- `on(eventType: string, listener: Listener)`
- `on(batch: { [eventType: string]: Listener })`
- `off(eventType: string, listener?: Listener)`
- `relayOn(source: EventEmitter, ...eventTypes: string[])`
- `relayOff(source: EventEmitter, ...eventTypes: string[])`
- `emit(eventType: string, data?: any)`
- `all<T = any>(eventType: string, data?: any): Promise<T[] | undefined>`
- `race<T = any>(eventType: string, data?: any): Promise<T | undefined>`
