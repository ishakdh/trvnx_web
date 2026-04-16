import { BaseRepository } from "../BaseRepository.js";
import { Customer } from "../../models/Customer.js";

export class CustomerAuthRepository extends BaseRepository {

    constructor() {
        super(Customer);
    }

    async findCustomerByEmail(email) {

    }

}
