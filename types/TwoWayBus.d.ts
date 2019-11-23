declare type Listener = (event: TwoWayEvent) => any;
declare type Batch = {
    [eventType: string]: Listener;
};
interface EventEmitter {
    on(eventType: string, listener: (event: any) => void): void;
    off(eventType: string, listener: (event: any) => void): void;
}
export declare class TwoWayEvent {
    readonly type: string;
    readonly mode: 'emit' | 'race' | 'all';
    readonly data: any;
    constructor(type: string, mode: 'emit' | 'race' | 'all', data: any);
}
export declare class TwoWayBus implements EventEmitter {
    private listeners;
    private relays;
    on(bindings: Batch): void;
    on(eventType: string, listener: Listener): void;
    off(eventType: string, listener?: Listener): boolean;
    relayOn(source: EventEmitter, ...events: string[]): void;
    relayOff(source: EventEmitter, ...events: string[]): void;
    reset(): void;
    emit(eventType: string, data?: any): Promise<void>;
    race<T = any>(eventType: string, data?: any): Promise<T | undefined>;
    all<T = any>(eventType: string, data?: any): Promise<T[]>;
    private runListeners;
}
export {};
