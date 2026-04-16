export class Factory {
    constructor(model, count) {
        this.model = model;
        this.count = count;
    }

    async create(overrides = {}) {
        const records = [];

        for (let i = 0; i < this.count; i++) {
            records.push({
                ...this.model.definition(),
                ...overrides
            });
        }

        return this.model.create(records);
    }
}
