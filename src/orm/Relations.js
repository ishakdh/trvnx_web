export function hasMany(Related, foreignKey, localKey = "id") {
    return async function () {
        return Related.where(foreignKey, "=", this.get(localKey)).get();
    };
}

export function belongsTo(Related, foreignKey, ownerKey = "id") {
    return async function () {
        return Related.where(ownerKey, "=", this.get(foreignKey)).first();
    };
}

/**
 * @param Related
 * @param pivotTable
 * @param foreignKey
 * @param relatedKey
 * @returns {function(): Promise<BaseModel[]>}
 */

export function belongsToMany(
    Related,
    pivotTable,
    foreignKey,
    relatedKey
) {
    return async function () {
        const id = this.get("id");

        const rows = await Related.query().client.query(`
      SELECT r.*
      FROM ${Related.table} r
      JOIN ${pivotTable} p ON p.${relatedKey} = r.id
      WHERE p.${foreignKey} = $1
    `, [id]);

        return rows.rows.map(r => Related.castRow(r));
    };
}

