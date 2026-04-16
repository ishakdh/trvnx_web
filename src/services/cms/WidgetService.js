import {WidgetRepository} from "../../repositories/cms/WidgetRepository.js";

export class WidgetService {

    constructor() {
        this.Repo = new WidgetRepository();
    }

    // Get All Page
    async getAllWidgets() {
        return this.Repo.all();
    }

    // Get Page By ID
    async getWidgetById(id) {
        return this.Repo.find(id);
    }

    // Create Page
    async createWidget(data) {
        if (!data.name) throw new Error("Name is required");
        return this.Repo.create(data);
    }

    // Update Page
    async updatePage(id, data) {
        return this.Repo.update(id, data);
    }
}
