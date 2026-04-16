import LicenseFee from '../models/LicenseFee.js';



export const getAllLicenseFees = async (req, res) => {
    try {
        // Fetch all fees from the database, sorted by the newest first
        const fees = await LicenseFee.find().sort({ createdAt: -1 });

        // Send the list back to the frontend with a 200 OK status
        res.status(200).json(fees);
    } catch (error) {
        // Send a 500 error if something went wrong during the fetch
        res.status(500).json({ message: "System error while fetching license fees", error: error.message });
    }
};