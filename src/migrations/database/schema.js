export const Schema = {
    async create(tableName, callback, client) {
        const columns = [];
        const constraints = [];

        const table = {
            id() {
                columns.push(`"id" BIGSERIAL PRIMARY KEY`);
            },

            uuid(name) {
                const col = new Column(`"${name}" UUID`);
                columns.push(col.sql);
                return col;
            },

            string(name, length = 255) {
                const col = new Column(`"${name}" VARCHAR(${length})`);
                columns.push(col.sql);
                return col;
            },

            text(name) {
                const col = new Column(`"${name}" TEXT`);
                columns.push(col.sql);
                return col;
            },

            integer(name) {
                const col = new Column(`"${name}" INTEGER`);
                columns.push(col.sql);
                return col;
            },

            bigInteger(name) {
                const col = new Column(`"${name}" BIGINT`);
                columns.push(col.sql);
                return col;
            },

            decimal(name, precision = 10, scale = 2) {
                const col = new Column(`"${name}" NUMERIC(${precision},${scale})`);
                columns.push(col.sql);
                return col;
            },

            boolean(name) {
                const col = new Column(`"${name}" BOOLEAN`);
                columns.push(col.sql);
                return col;
            },

            json(name) {
                const col = new Column(`"${name}" JSONB`);
                columns.push(col.sql);
                return col;
            },

            enum(name, values) {
                const enumValues = values.map(v => `'${v}'`).join(", ");
                const col = new Column(`"${name}" TEXT CHECK ("${name}" IN (${enumValues}))`);
                columns.push(col.sql);
                return col;
            },

            timestamps() {
                columns.push(`"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
                columns.push(`"updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            },

            softDeletes() {
                columns.push(`"deleted_at" TIMESTAMP NULL`);
            },

            // 🔥 INDEXES

            index(name, cols) {
                constraints.push(`CREATE INDEX "${name}" ON "${tableName}" (${cols.map(c => `"${c}"`).join(", ")});`);
            },

            uniqueIndex(name, cols) {
                constraints.push(`CREATE UNIQUE INDEX "${name}" ON "${tableName}" (${cols.map(c => `"${c}"`).join(", ")});`);
            },

            // 🔥 FOREIGN KEY

            foreign(column) {
                return new ForeignKey(column, tableName, constraints);
            }
        };

        callback(table);

        const createTableSQL = `
            CREATE TABLE "${tableName}" (
                                            ${columns.join(",\n")}
            );
        `;

        await client.query(createTableSQL);

        for (const c of constraints) {
            await client.query(c);
        }
    },

    async dropIfExists(tableName, client) {
        await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
    }
};


class Column {
    constructor(sql) {
        this.sql = sql;
    }

    nullable() {
        this.sql += " NULL";
        return this;
    }

    notNullable() {
        this.sql += " NOT NULL";
        return this;
    }

    unique() {
        this.sql += " UNIQUE";
        return this;
    }

    default(value) {
        if (typeof value === "string") {
            this.sql += ` DEFAULT '${value}'`;
        }
        else if (typeof value === "boolean") {
            this.sql += ` DEFAULT ${value ? "TRUE" : "FALSE"}`;
        }
        else {
            this.sql += ` DEFAULT ${value}`;
        }
        return this;
    }
}

class ForeignKey {
    constructor(column, tableName, constraints) {
        this.column = column;
        this.tableName = tableName;
        this.constraints = constraints;
        this.refTable = null;
        this.refColumn = "id";
        this.onDeleteAction = "";
        this.onUpdateAction = "";
    }

    references(column) {
        this.refColumn = column;
        return this;
    }

    on(table) {
        this.refTable = table;
        return this;
    }

    cascadeOnDelete() {
        this.onDeleteAction = "ON DELETE CASCADE";
        this._push();
        return this;
    }

    restrictOnDelete() {
        this.onDeleteAction = "ON DELETE RESTRICT";
        this._push();
        return this;
    }

    nullOnDelete() {
        this.onDeleteAction = "ON DELETE SET NULL";
        this._push();
        return this;
    }

    cascadeOnUpdate() {
        this.onUpdateAction = "ON UPDATE CASCADE";
        this._push();
        return this;
    }

    _push() {
        this.constraints.push(`
ALTER TABLE "${this.tableName}"
ADD CONSTRAINT "fk_${this.tableName}_${this.column}"
FOREIGN KEY ("${this.column}")
REFERENCES "${this.refTable}"("${this.refColumn}")
${this.onDeleteAction}
${this.onUpdateAction};
`);
    }
}