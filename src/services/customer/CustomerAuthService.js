import { CustomerAuthRepository } from "../../repositories/customer/CustomerAuthRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class CustomerAuthService {
    constructor() {
        this.customerRepo = new CustomerAuthRepository();
    }

    async createCustomer(data) {
        if (!data.email) throw new Error("Email is required");
        if (!data.password) throw new Error("Password is required");

        const customerExists = await this.customerRepo.findValue("email", data.email );
        if (customerExists) {
             throw new Error("Customer Email is Exist");
        }

        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
        return this.customerRepo.create(data);
    }

    async login(email, password) {
        // 1️⃣ Fetch user including password
        const qb = await User.query();
        const user = await qb.where("email", "=", email).first({ includeHidden: true });

        if (!user) throw new Error("User Not found");

        // 2️⃣ Compare passwords
        const valid = await bcrypt.compare(password, user.$attributes.password);
        if (!valid) throw new Error("Invalid credentials");

        // 3️⃣ Generate JWT
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 4️⃣ Sanitize user before returning
        const { password: _pass, ...sanitizedUser } = user;

        return {
            user: sanitizedUser,
            token
        };
    }

    async customerById(id) {
        return this.customerRepo.find(id);
    }



    async allCustomers(id) {
        return this.customerRepo.all(id);
    }


}
