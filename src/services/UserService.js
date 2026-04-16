import { UserRepository } from "../repositories/UserRepository.js";

export class UserService {
    constructor() {
        this.userRepo = new UserRepository();
    }

    async createUser(data) {
        // You can add business rules here
        if (!data.email) throw new Error("Email is required");

        return this.userRepo.create(data);
    }

    async getAdmins() {
        return this.userRepo.findAdmins();
    }

    async updateUserEmail(id, email) {
        return this.userRepo.update({ id }, { email });
    }
}
