export class BaseRepository {

    constructor(model) {
        this.model = model;
    }

    // Find all records
    async all() {
        return this.model.all();
    }

    // Find by id
    async find(id) {
        return this.model.find(id);
    }

    async findValue(column,value) {
        return this.model.findByColumnValue(column,value);
    }

    // Create single or multiple
    async create(data) {
        return this.model.create(data);
    }

    // Update by condition
    async update(condition, data) {
        const qb = this.model.query();
        for (const key in condition) {
            qb.where(key, "=", condition[key]);
        }
        return qb.updateMany(data);
    }

    // Delete by condition
    async delete(condition) {
        const qb = this.model.query();
        for (const key in condition) {
            qb.where(key, "=", condition[key]);
        }
        return qb.delete();
    }

    // FirstOrCreate
    async firstOrCreate(where, data = {}) {
        return this.model.firstOrCreate(where, data);
    }

    // UpdateOrCreate
    async updateOrCreate(where, data) {
        return this.model.updateOrCreate(where, data);
    }

    // Upsert
    async upsert(unique, data) {
        return this.model.upsert(unique, data);
    }
}
