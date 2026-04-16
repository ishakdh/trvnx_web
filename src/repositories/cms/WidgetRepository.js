import { BaseRepository } from "../BaseRepository.js";
import {CMSPageWidget} from "../../models/CMSPageWidget.js";

export class WidgetRepository extends BaseRepository {

    /**
     * BaseRepository already provides:
     *
     * Method	Usage
     * all()	Get all records
     * find(id)	Find by id
     * create(data)	Create record
     * update(condition,data)	Update records
     * delete(condition)	Delete records
     * firstOrCreate()	Create if not exists
     * updateOrCreate()	Update or create
     * upsert()	Insert or update
     */

    constructor() {
        super(CMSPageWidget);
    }

}
