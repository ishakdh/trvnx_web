import { OrderService } from "../../../services/order/OrderService.js";

export class OrderController {
    constructor() {
        this.service = new OrderService();
    }

    create = async (req, res) => {
        const order = await this.service.createOrder(req.body);

        const installmentData = [{
            "order_item_id": order.id,
            "installment_amount": 500,
            "due_date": "2026-03-23",
            "secret_code": "1234",
            "status": "pending",
        },
            {
                "order_item_id": order.id,
                "installment_amount": 500,
                "due_date": "2026-03-29",
                "secret_code": "1235",
                "status": "pending",
            },
            {
                "order_item_id": order.id,
                "installment_amount": 500,
                "due_date": "2026-04-05",
                "secret_code": "1236",
                "status": "pending",
            }
            ];

        await this.service.createInstallment(installmentData);
        res.status(201).json(order);
    };


    test = async (req, res) => {
        res.status(201).json([]);
    };

}