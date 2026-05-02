import { pool } from "../config/database.js";
import { QueryBuilder } from "./QueryBuilder.js";
import { BaseModel } from "./BaseModel.js";
import { Events } from "./Events.js";
import { Factory } from "./Factory.js";

export class Model {

    static table = "";
    static fillable = [];
    static guarded = [];
    static softDeletes = false;
    static casts = {};

    static async query() {
        const client = await pool.connect();
        return new QueryBuilder(this, this.table, client);
    }

    static castRow(row) {
        for (const key in this.casts) {
            if (row[key] == null) continue;
            if (this.casts[key] === "date") row[key] = new Date(row[key]);
            if (this.casts[key] === "boolean") row[key] = Boolean(row[key]);
            if (this.casts[key] === "number") row[key] = Number(row[key]);
        }
        return new BaseModel(row, this);
    }

    static async all() {
        return (await this.query()).get();
    }

    static async find(id) {
        return (await this.query()).where("id", "=", id).first();
    }

    static async findByColumnValue(column,value) {
        return (await this.query()).where(column, "=", value).first();
    }


    // static async create(data) {
    //     const payload = {};
    //     for (const key of this.fillable) {
    //         if (key in data) payload[key] = data[key];
    //     }
    //     return (await this.query()).insert(payload);
    // }

    // static async create(data) {
    //     const payload = {};
    //     for (const key of this.fillable) {
    //         if (key in data) payload[key] = data[key];
    //     }
    //
    //     this.fire("creating", payload);
    //     return (await this.query()).insert(payload);
    // }

    static async create(data) {
        // MULTIPLE RECORDS
        if (Array.isArray(data)) {
            const payloads = data.map(item => {
                const filtered = {};
                for (const key of this.fillable) {
                    if (key in item) filtered[key] = item[key];
                }
                this.fire("creating", filtered);
                return filtered;
            });

            return (await this.query()).insertMany(payloads);
        }

        // SINGLE RECORD
        const payload = {};
        for (const key of this.fillable) {
            if (key in data) payload[key] = data[key];
        }

        this.fire("creating", payload);
        return (await this.query()).insert(payload);
    }

    static async firstOrCreate(where, data = {}) {
        const qb = await this.query();
        for (const key in where) qb.where(key, "=", where[key]);

        const found = await qb.first();
        if (found) return found;

        return this.create({ ...where, ...data });
    }

    static async updateOrCreate(where, data) {
        const qb = await this.query();
        for (const key in where) qb.where(key, "=", where[key]);

        const found = await qb.first();
        if (found) {
            await this.where("id", "=", found.get("id")).updateMany(data);
            return this.find(found.get("id"));
        }

        return this.create({ ...where, ...data });
    }

    static async upsert(unique, data) {
        const keys = Object.keys({ ...unique, ...data });
        const values = Object.values({ ...unique, ...data });

        const updates = Object.keys(data)
            .map((k, i) => `${k}=$${i + 1 + keys.length}`)
            .join(",");

        const sql = `
    INSERT INTO ${this.table} (${keys.join(",")})
    VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")})
    ON CONFLICT (${Object.keys(unique).join(",")})
    DO UPDATE SET ${updates}
    RETURNING *
  `;

        const client = (await this.query()).client;
        const { rows } = await client.query(sql, [...values, ...Object.values(data)]);
        client.release();

        return this.castRow(rows[0]);
    }

    static async where(col, op, val) {
        return (await this.query()).where(col, op, val);
    }

    // static async with(relations) {
    //     return (await this.query()).with(relations);
    // }

    static async with(relations) {
        const qb = await this.query();
        return qb.with(relations);
    }

    static async loadRelation(models, relationName) {
        if (!models.length) return;

        const relation = models[0][relationName];
        if (typeof relation !== "function") {
            throw new Error(`Relation ${relationName} not defined`);
        }

        const related = await Promise.all(models.map(m => m[relationName]()));
        models.forEach((m, i) => (m[relationName] = related[i]));
    }



    static async delete(id) {
        if (this.softDeletes) {
            return (await this.query())
                .where("id", "=", id)
                .update({ deleted_at: new Date() });
        }
        return (await this.query()).where("id", "=", id).delete();
    }

    // EVENTS
    static creating(callback) {
        Events.on(this.name, "creating", callback);
    }

    static fire(event, payload) {
        Events.fire(this.name, event, payload);
    }

    // Factory
    static factory(count = 1) {
        return new Factory(this, count);
    }

}
