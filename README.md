# two-way-bus

Asynchronous pub/sub event bus that allows listeners to respond to events directly.

1. [Basic Usage](#basic-usage)
2. [Event Objects](#event-objects)
3. [Relay Events](#relay-events)
4. [API Reference](#api-reference)

# Basic Usage

If you've done JavaScript development for a while, you've probably come across the pub/sub model. In this setup, the object known as the _event bus_ acts as a broadcaster: objects can _subscribe_ to certain types of events by passing a callback function (also called a _listener_), so that when other objects _publish_ an event of that type on the bus, the callback function will be invoked.

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
- In the case of `race`, it resolves to the result from the listener that first returns (note, however, that all listeners will still be invoked).

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

As seen in the example above, listeners may also return a `Promise` instead of an immediate result.

In essence, `TwoWayBus` can allow any number of objects to cooperate and share data, without needing to hold references to each other or even knowing each other's interfaces. This can help greatly in separating concerns, and preventing complicated mutual dependencies.

# Event Objects

Event listeners of a `TwoWayBus` receive a `TwoWayEvent` object as their argument, with the following properties:

## `type`

Contains the event type string that was supplied as the first argument of `emit`/`all`/`race`.

```typescript
import { TwoWayBus, TwoWayEvent } from 'two-way-bus';

const bus = new TwoWayBus();

const listener = (e: TwoWayEvent) => console.log(e.type, 'was emitted');

bus.on('event-a', listener);
bus.on('event-b', listener);

bus.emit('event-b');
// Output: "event-b was emitted"
```

## `mode`

Contains the string `"emit"`, `"all"` or `"race"`, depending on which method of the bus was called.

```typescript
import { TwoWayBus, TwoWayEvent } from 'two-way-bus';

const bus = new TwoWayBus();

const listener = (e: TwoWayEvent) => console.log(e.mode, 'was invoked');

bus.on('event', listener);

bus.emit('event');
// Output: "emit was invoked"
```

## `data`

Contains an optional, arbitrary value that may be passed as a second argument to `emit`/`all`/`race`.

```typescript
import { TwoWayBus, TwoWayEvent } from 'two-way-bus';

const bus = new TwoWayBus();

const listener = (e: TwoWayEvent) => console.log(e.data, 'was passed');

bus.on('event', listener);

bus.emit('event', 'Some data');
// Output: "Some data was passed"
```

# Relay Events

Another feature of `TwoWayBus` is the ability to "relay" select events from another bus:

```javascript
import { TwoWayBus } from 'two-way-bus';

const source = new TwoWayBus();
const relay = new TwoWayBus();

const iAmJohn = () => console.log('Hello, I am John.');

source.on('everyone', iAmJohn);
source.on('me-only', iAmJohn);

// Relay the "everyone" event:
relay.relayOn(source, 'everyone');

const iAmJane = () => console.log('Hi, I am Jane.');

relay.on('everyone', iAmJane);
relay.on('me-only', iAmJane);

// Emit events:

source.emit('everyone');
// "Hello, I am John."
// "Hi, I am Jane."

source.emit('me-only');
// "Hello, I am John."

relay.emit('everyone');
// "Hi, I am Jane."

relay.emit('me-only');
// "Hi, I am Jane."
```

In this example, we defined two event buses, `source` and `relay`. Then, in the following line:

```javascript
relay.relayOn(source, 'everyone');
```

-- we have instructed the `relay` bus to subscribe to the `"everyone"` event on the `source` bus, and forward the event to its own listeners. This basically means that all listeners that subscribe to the `"everyone"` event on `relay` will behave as if they were also subscribed to the same event on `"source"`. This includes returning results via `all` and `race`.

Note that, as shown at the end of the example, we can still publish the events directly on the `relay` bus.

If relaying an event is no longer needed, you can unsubscribe the bus via the `relayOff()` method:

```javascript
relay.relayOff(source, 'everyone');

source.emit('everyone');
// "Hello, I am John."
```

# API Reference

## `class TwoWayEvent`

Event listeners that subscribe to a `TwoWayBus` receive a `TwoWayEvent` object as their arugment.

### `readonly type: string`

Contains the event type that was passed as the first argument to `emit()`/`all()`/`race()`.

### `readonly mode: 'emit' | 'all' | 'race'`

Indicates which method was used to publish this event.

### `readonly data?: any`

Contains an optional, arbitrary value (primitive or object) that was passed as the second argument to `emit()`/`all()`/`race()`.

## `type Listener = (event: TwoWayEvent) => any | Promise<any>`\*\*

Event listeners that subscribe to a `TwoWayBus` may return a result directly, or a `Promise` that resolves to a result. If the event was dispatched with `emit()`, the result will be ignored.

## `class EventBus`

### `on(eventType: string, listener: Listener)`

Subscribe to an event on this bus.

### `on(batch: { [eventType: string]: Listener })`

Convenience method for subscribing to multiple events at once.

```javascript
bus.on({
  'event-one': listenerOne,
  'event-two': listenerTwo,
});

// The above is fully equivalent to:
bus.on('event-one', listenerOne);
bus.on('event-two', listenerTwo);
```

### `off(eventType: string, listener: Listener)`

Unsubscribe one specific listener from one specific event on this bus.

### `off(eventType: string)`

Unsubscribe _all_ listeners from a specific event on this bus.

### `relayOn(source: TwoWayBus, ...eventTypes: string[])`

Relay one or more event types from `source` to the listeners of this bus. Multiple event types may be listed.

```javascript
bus.relayOn(source, 'event-a', 'event-b');

// The above is fully equivalent to:
bus.relayOn(source, 'event-a');
bus.relayOn(source, 'event-b');
```

### `relayOff(source: TwoWayBus, ...eventTypes: string[])`

Cease relaying one or more event types from `source` to the listeners of this bus. Multiple event types may be listed.

```javascript
bus.relayOff(source, 'event-a', 'event-b');

// The above is fully equivalent to:
bus.relayOff(source, 'event-a');
bus.relayOff(source, 'event-b');
```

### `relayOff(source: TwoWayBus)`

Cease relaying _all_ events from `source`.

```javascript
bus.relayOn(source, 'event-a', 'event-b');
bus.relayOff(source);

// The above is fully equivalent to:
bus.relayOn(source, 'event-a', 'event-b');
bus.relayOff(source, 'event-a');
bus.relayOff(source, 'event-b');
```

### `reset()`

Unsubscribe _all_ listeners from _all_ events, and cease _all_ relays, essentially resetting the bus to its initial state. Note that any events in progress will still be handled.

```javascript
bus.reset();

// The above is fully equivalent to:
bus.off();
bus.relayOff();
```

### `emit(eventType: string, data?: any): void`

Publish an event for the listeners on this bus, much like in any traditional pub/sub architecture. No results will be returned. If a second argument is provided, it will be passed as the `data` property of the [`TwoWayEvent`](#two-way-event).

### `all<T = any>(eventType: string, data?: any): Promise<T[] | undefined>`

Publish an event for the listeners on this bus, and collect their return values in an array. If one or more listeners return a `Promise`, the bus will wait for them to resolve.

The order in which listeners will be invoked should be assumed to be non-deterministic.

### `race<T = any>(eventType: string, data?: any): Promise<T | undefined>`

Publish an event for the listeners on this bus, and return the first concrete value (i.e. that is not a `Promise`). If one or more listeners return a `Promise`, and no concrete value has been received yet, the bus will wait for them to resolve until a concrete value is received.

Note that _all_ listeners on the bus will be invoked, regardless of whether or not the others have returned concerete values or `Promise`s.

The order in which listeners will be invoked should be assumed to be non-deterministic.
