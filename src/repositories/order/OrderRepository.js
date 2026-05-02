import { BaseRepository } from "../BaseRepository.js";
import { Order } from "../../models/Order.js";

export class OrderRepository extends BaseRepository {

    constructor() {
        super(Order);
    }

}
