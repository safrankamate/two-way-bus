type Listener = (event: TwoWayEvent) => any;
type Batch = { [eventType: string]: Listener };

interface EventEmitter {
  on(eventType: string, listener: (event: any) => void): void;
  off(eventType: string, listener: (event: any) => void): void;
}

export class TwoWayEvent {
  constructor(
    public readonly type: string,
    public readonly mode: 'emit' | 'race' | 'all',
    public readonly data: any,
  ) {
    Object.freeze(this);
  }
}

export class TwoWayBus implements EventEmitter {
  private listeners: Record<string, Listener[]> = {};
  private relays = new WeakMap<EventEmitter, Record<string, Listener>>();

  on(bindings: Batch): void;
  on(eventType: string, listener: Listener): void;
  on(typeOrBatch: any, listener?: Listener): void {
    if (typeof typeOrBatch === 'object') {
      const bindings = typeOrBatch;
      for (const eventType in bindings) {
        this.on(eventType, bindings[eventType]);
      }
    }
    if (typeof typeOrBatch === 'string') {
      const eventType = typeOrBatch;
      if (!this.listeners[eventType]) {
        this.listeners[eventType] = [];
      }
      this.listeners[eventType].push(listener);
    }
  }

  off(eventType: string, listener?: Listener): boolean {
    if (!this.listeners[eventType]) return false;

    if (listener) {
      const listeners = this.listeners[eventType];
      const index = listeners.findIndex(l => l === listener);
      return !!listeners.splice(index, 1).length;
    } else {
      const listeners = this.listeners[eventType];
      delete this.listeners[eventType];
      return !!(listeners && listeners.length);
    }
  }

  relayOn(source: EventEmitter, ...events: string[]) {
    const listeners = this.relays.get(source) || {};
    for (const eventType of events) {
      const listener: Listener = event => {
        const data = event instanceof TwoWayEvent ? event.data : event;
        this.emit(eventType, data);
      };
      listeners[eventType] = listener;
      source.on(eventType, listener);
    }
    this.relays.set(source, listeners);
  }

  relayOff(source: EventEmitter, ...events: string[]) {
    const listeners = this.relays.get(source);
    if (!listeners) return;

    if (events.length === 0) {
      events = Object.keys(listeners);
    }
    for (const eventType of events) {
      const listener = listeners[eventType];
      if (listener) {
        source.off(eventType, listener);
        delete listeners[eventType];
      }
    }
  }

  async emit(eventType: string, data?: any) {
    if (!this.listeners[eventType]) return;
    await Promise.resolve();

    const event = new TwoWayEvent(eventType, 'emit', data);
    for (let listener of this.listeners[eventType]) {
      listener.call(undefined, event);
    }
  }

  async race<T = any>(eventType: string, data?: any): Promise<T | undefined> {
    if (!this.listeners[eventType]) return Promise.resolve(undefined);

    const event = new TwoWayEvent(eventType, 'race', data);
    return Promise.race(this.runListeners<T>(event));
  }

  async all<T = any>(eventType: string, data?: any): Promise<T[]> {
    if (!this.listeners[eventType]) return Promise.resolve([]);

    const event = new TwoWayEvent(eventType, 'all', data);
    return Promise.all(this.runListeners<T>(event));
  }

  private runListeners<T = any>(event: TwoWayEvent): Promise<T>[] {
    return this.listeners[event.type].map(listener => {
      try {
        return listener.call(undefined, event);
      } catch (e) {
        return undefined;
      }
    });
  }
}
