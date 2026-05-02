import { UserService } from "../../../services/UserService.js";

class UserController {
    constructor() {
        this.service = new UserService();
    }

    async index(req, res) {
        const users = await this.service.getAdmins();
        res.json(users);
    }

    async store(req, res) {
        const user = await this.service.createUser(req.body);
        res.json(user);
    }
}

export default new UserController();

