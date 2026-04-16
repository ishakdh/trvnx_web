export class BaseModel {
    constructor(attributes = {}, modelClass) {
        this.$attributes = attributes;
        this.$model = modelClass;
    }

    get(key) {
        return this.$attributes[key];
    }

    set(key, value) {
        this.$attributes[key] = value;
    }

    toJSON() {
        return this.$attributes;
    }

    async save() {
        const id = this.$attributes.id;
        if (!id) throw new Error("Cannot save model without id");

        const { id: _, ...data } = this.$attributes;
        return this.$model.where("id", "=", id).update(data);
    }

    async delete() {
        return this.$model.delete(this.$attributes.id);
    }
}
