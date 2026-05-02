export class Events {
    static events = {};

    static on(model, event, callback) {
        this.events[`${model}:${event}`] = callback;
    }

    static fire(model, event, payload) {
        const key = `${model}:${event}`;
        if (this.events[key]) {
            this.events[key](payload);
        }
    }
}
