import { OrderRepository } from "../../repositories/order/OrderRepository.js";
import { InstallmentRepository } from "../../repositories/order/InstallmentRepository.js";


export class OrderService {
    constructor() {
        this.orderRepo = new OrderRepository();
        this.installmentRepo = new InstallmentRepository();
    }

    async createOrder(data) {
        return this.orderRepo.create(data);
    }

    async createInstallment(data) {
        return this.installmentRepo.create(data);
    }


}
