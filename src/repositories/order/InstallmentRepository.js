import { BaseRepository } from "../BaseRepository.js";
import { Installment } from "../../models/Installment.js";

export class InstallmentRepository extends BaseRepository {

    constructor() {
        super(Installment);
    }

}
