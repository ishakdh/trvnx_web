import { BaseRepository } from "./BaseRepository.js";
import  User from "../models/User.js";

export class UserRepository extends BaseRepository {

    constructor() {
        super(User);
    }

    // Custom query for users
    async findAdmins() {
        return this.model.query().where("is_admin", "=", true).get();
    }

    async findByEmail(email) {
        return this.model.query().where("email", "=", email).first();
    }

}
