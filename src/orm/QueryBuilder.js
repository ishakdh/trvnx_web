export class QueryBuilder {
    constructor(model, table, client) {
        this.model = model;
        this.table = table;
        this.client = client;
        this.wheres = [];
        this.values = [];
        this.joins = [];
    }

    with(relations) {
        this.relations = Array.isArray(relations) ? relations : [relations];
        return this;
    }

    where(column, operator, value) {
        this.wheres.push(`${column} ${operator} $${this.values.length + 1}`);
        this.values.push(value);
        return this;
    }

    // async get() {
    //     const where = this.wheres.length ? `WHERE ${this.wheres.join(" AND ")}` : "";
    //     const sql = `SELECT * FROM ${this.table} ${where}`;
    //     const { rows } = await this.client.query(sql, this.values);
    //     this.client.release();
    //     return rows.map(r => this.model.castRow(r));
    // }

    // async get() {
    //     const where = this.wheres.length ? `WHERE ${this.wheres.join(" AND ")}` : "";
    //     const sql = `SELECT * FROM ${this.table} ${where}`;
    //
    //     const { rows } = await this.client.query(sql, this.values);
    //     this.client.release();
    //
    //     const models = rows.map(r => this.model.castRow(r));
    //
    //     // 🔥 Eager loading
    //     if (this.relations && models.length) {
    //         for (const relation of this.relations) {
    //             await this.model.loadRelation(models, relation);
    //         }
    //     }
    //
    //     return models;
    // }

    async get() {

        const joins = this.joins.length ? this.joins.join(" ") : "";

        const where = this.wheres.length
            ? `WHERE ${this.wheres.join(" AND ")}`
            : "";

        const sql = `
        SELECT *
        FROM ${this.table}
        ${joins}
        ${where}
    `;

        const { rows } = await this.client.query(sql, this.values);

        this.client.release();

        return rows.map(r => this.model.castRow(r));
    }

    // async first() {
    //     const rows = await this.get();
    //     return rows[0] ?? null;
    // }

    async first() {
        const results = await this.get();
        return results[0] ?? null;
    }

    async insert(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const cols = keys.join(",");
        const params = keys.map((_, i) => `$${i + 1}`).join(",");

        const sql = `
      INSERT INTO ${this.table} (${cols})
      VALUES (${params})
      RETURNING *
    `;
        const { rows } = await this.client.query(sql, values);
        this.client.release();
        return this.model.castRow(rows[0]);
    }

    async insertMany(rows) {
        if (!rows.length) return [];

        const columns = Object.keys(rows[0]);
        const values = [];
        const placeholders = [];

        rows.forEach((row, rowIndex) => {
            const rowPlaceholders = [];
            columns.forEach((col, colIndex) => {
                values.push(row[col]);
                rowPlaceholders.push(`$${values.length}`);
            });
            placeholders.push(`(${rowPlaceholders.join(",")})`);
        });

        const sql = `
    INSERT INTO ${this.table} (${columns.join(",")})
    VALUES ${placeholders.join(",")}
    RETURNING *
  `;

        const { rows: inserted } = await this.client.query(sql, values);
        this.client.release();

        return inserted.map(r => this.model.castRow(r));
    }


    async update(data) {
        const set = Object.keys(data)
            .map((k, i) => `${k}=$${i + 1}`)
            .join(",");

        const whereOffset = Object.keys(data).length;
        const where = this.wheres
            .map(w => w.replace(/\$(\d+)/g, (_, n) => `$${+n + whereOffset}`))
            .join(" AND ");

        const sql = `
      UPDATE ${this.table}
      SET ${set}
      WHERE ${where}
      RETURNING *
    `;
        const { rows } = await this.client.query(sql, [...Object.values(data), ...this.values]);
        this.client.release();
        return rows.map(r => this.model.castRow(r));
    }

    async paginate(perPage = 10, page = 1) {
        const offset = (page - 1) * perPage;

        const where = this.wheres.length ? `WHERE ${this.wheres.join(" AND ")}` : "";

        const dataSql = `
    SELECT * FROM ${this.table}
    ${where}
    LIMIT ${perPage} OFFSET ${offset}
  `;

        const countSql = `
    SELECT COUNT(*) FROM ${this.table} ${where}
  `;

        const [{ rows }, count] = await Promise.all([
            this.client.query(dataSql, this.values),
            this.client.query(countSql, this.values)
        ]);

        this.client.release();

        return {
            data: rows.map(r => this.model.castRow(r)),
            meta: {
                total: Number(count.rows[0].count),
                per_page: perPage,
                current_page: page,
                last_page: Math.ceil(count.rows[0].count / perPage)
            }
        };
    }


    async delete() {
        const where = this.wheres.join(" AND ");
        await this.client.query(`DELETE FROM ${this.table} WHERE ${where}`, this.values);
        this.client.release();
    }

    // Extended
    async updateMany(data) {
        const set = Object.keys(data)
            .map((k, i) => `${k}=$${i + 1}`)
            .join(",");

        const whereOffset = Object.keys(data).length;
        const where = this.wheres
            .map(w => w.replace(/\$(\d+)/g, (_, n) => `$${+n + whereOffset}`))
            .join(" AND ");

        const sql = `
    UPDATE ${this.table}
    SET ${set}
    WHERE ${where}
  `;

        await this.client.query(sql, [...Object.values(data), ...this.values]);
        this.client.release();
    }

    join(table, first, operator, second, type = "INNER") {
        this.joins.push(`${type} JOIN ${table} ON ${first} ${operator} ${second}`);
        return this;
    }

    leftJoin(table, first, operator, second) {
        return this.join(table, first, operator, second, "LEFT");
    }

    rightJoin(table, first, operator, second) {
        return this.join(table, first, operator, second, "RIGHT");
    }


}


