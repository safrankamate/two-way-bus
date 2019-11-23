"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TwoWayEvent {
    constructor(type, mode, data) {
        this.type = type;
        this.mode = mode;
        this.data = data;
        Object.freeze(this);
    }
}
exports.TwoWayEvent = TwoWayEvent;
class TwoWayBus {
    constructor() {
        this.listeners = {};
        this.relays = new WeakMap();
    }
    on(typeOrBatch, listener) {
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
    off(eventType, listener) {
        if (!this.listeners[eventType])
            return false;
        if (listener) {
            const listeners = this.listeners[eventType];
            const index = listeners.findIndex(l => l === listener);
            return !!listeners.splice(index, 1).length;
        }
        else {
            const listeners = this.listeners[eventType];
            delete this.listeners[eventType];
            return !!(listeners && listeners.length);
        }
    }
    relayOn(source, ...events) {
        const listeners = this.relays.get(source) || {};
        for (const eventType of events) {
            const listener = async (event) => {
                const data = event instanceof TwoWayEvent ? event.data : event;
                if (event.mode === 'all') {
                    const results = await this.all(eventType, data);
                    return { __relay: true, results };
                }
                else if (event.mode === 'race') {
                    return this.race(eventType, data);
                }
                else {
                    this.emit(eventType, data);
                }
            };
            listeners[eventType] = listener;
            source.on(eventType, listener);
        }
        this.relays.set(source, listeners);
    }
    relayOff(source, ...events) {
        const listeners = this.relays.get(source);
        if (!listeners)
            return;
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
    async emit(eventType, data) {
        if (!this.listeners[eventType])
            return;
        await Promise.resolve();
        const event = new TwoWayEvent(eventType, 'emit', data);
        for (let listener of this.listeners[eventType]) {
            listener.call(undefined, event);
        }
    }
    async race(eventType, data) {
        if (!this.listeners[eventType])
            return Promise.resolve(undefined);
        const event = new TwoWayEvent(eventType, 'race', data);
        return Promise.race(this.runListeners(event));
    }
    async all(eventType, data) {
        if (!this.listeners[eventType])
            return Promise.resolve([]);
        const event = new TwoWayEvent(eventType, 'all', data);
        const results = await Promise.all(this.runListeners(event));
        const result = [];
        for (const item of results) {
            if (typeof item === 'object' && item && '__relay' in item) {
                result.push(...item.results);
            }
            else {
                result.push(item);
            }
        }
        return result;
    }
    runListeners(event) {
        return this.listeners[event.type].map(listener => {
            try {
                return listener.call(undefined, event);
            }
            catch (e) {
                return undefined;
            }
        });
    }
}
exports.TwoWayBus = TwoWayBus;
