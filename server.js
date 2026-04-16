const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User.js'); // Import the model we just made

const app = express();
app.use(cors());
app.use(express.json());

// CONNECT TO MONGODB
// Make sure MongoDB is running on your computer!
mongoose.connect('mongodb://127.0.0.1:27017/trvnx_os')
    .then(() => console.log("Connected to TRVNX Database"))
    .catch(err => console.log("DB Connection Error: ", err));

// NEW API: Register a User (with your specific address blueprint)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role, address } = req.body;

        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            role,
            address: {
                line1: address.line1,
                line2: address.line2,
                division: address.division,
                district: address.district,
                police_station: address.police_station
            }
        });

        await newUser.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));