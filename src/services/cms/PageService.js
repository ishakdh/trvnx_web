import {PageRepository} from "../../repositories/cms/PageRepository.js";


export class PageService {

    constructor() {
        this.PageRepo = new PageRepository();
    }

    // Get All Page
    async getAllPages() {
        return this.PageRepo.all();
    }

    async allPageWithWidget() {
        return this.PageRepo.allPageWithWidget();
    }

    // Get Page By ID
    async getPageById(id) {
        return this.PageRepo.find(id);
    }

    // Create Page
    async createPage(data) {
        if (!data.name) throw new Error("Name is required");
        return this.PageRepo.create(data);
    }

    // Update Page
    async updatePage(id, data) {
        return this.PageRepo.update(id, data);
    }
}
