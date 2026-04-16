import { CustomerAuthService } from "../../../services/customer/CustomerAuthService.js";

export class CustomerAuthController {
    constructor() {
        this.service = new CustomerAuthService();
    }

    register = async (req, res) => {
        const user = await this.service.createCustomer(req.body);
        res.status(201).json(user);
    };

    login = async (req, res) => {
        const { email, password } = req.body;
        const result = await this.service.login(email, password);
        res.json(result);
    };


    checkLicense = async (req, res) => {
        res.status(201).json(
            {
                customer: {
                  id: 1,
                  name: "Isahak Khan",
                  phone: "01837664478"
                },
                order: {
                    "customer_id": 1,
                    "user_id": 1,
                    "order_type": "Installment",
                    "total_amount": 5000,
                    "due_amount": 4000,
                    "paid_amount": 1000,
                    "status": "paid",
                    "type": "buy",
                    items: [{
                        "id": 1,
                        "order_id": 1,
                        "product_id": 1,
                        "product_name": "Oppo 23 Phone",
                        "unit_price": 5000,
                        "quantity": 1,
                        "total_price": 5000
                        }]
                },
                installments: [
                    {
                        "id": 1,
                        "order_item_id": 1,
                        "installment_amount": 1000,
                        "due_amount": 4000,
                        "due_date": "2026-03-22",
                        "secret_code": "1234",
                        "status": "paid"
                    },
                    {
                        "id": 2,
                        "order_item_id": 1,
                        "installment_amount": 1000,
                        "due_date": "2026-03-25",
                        "due_amount": 3000,
                        "secret_code": "1235",
                        "status": "paid"
                    },
                    {
                        "id": 3,
                        "order_item_id": 1,
                        "installment_amount": 1000,
                        "due_date": "2026-03-25",
                        "due_amount": 2000,
                        "secret_code": "1236",
                        "status": "paid"
                    },
                    {
                        "id": 4,
                        "order_item_id": 1,
                        "installment_amount": 1000,
                        "due_date": "2026-03-29",
                        "due_amount": 1000,
                        "secret_code": "1237",
                        "status": "paid"
                    }
                ],
                deviceAdminStatus: true
            }
        );
    };

    test = async (req, res) => {
        res.status(201).json({status: "test"});
    };

}