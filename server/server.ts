// });
const express = require("express");
import { Request, Response } from "express";

import mongoose from "mongoose";
import dotenv = require("dotenv");
import cors = require("cors");
import bcrypt = require("bcryptjs");
import jwt = require("jsonwebtoken");

dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://saifkhanali101:UK18b7343@cluster0.lvgws.mongodb.net/chatter?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// User Schema & Model
interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model<IUser>("User", userSchema);

// Signup Route
app.post("/signup", async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
  }: { name: string; email: string; password: string } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Save new user
  const newUser = new User({ name, email, password: hashedPassword });
  await newUser.save();

  return res.status(201).json({ message: "User registered successfully" });
});

// Login Route (Now includes name in the JWT)
app.post("/login", async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Generate JWT token with name
  const token = jwt.sign(
    { userId: user._id, name: user.name, email: user.email },
    "abcd123489ybehbg",
    { expiresIn: "1h" }
  );

  return res.status(200).json({ token, name: user.name });
});

app.get("/home", (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  jwt.verify(token, "abcd123489ybehbg", async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    const decodedPayload = decoded as { userId: string };
    const user = await User.findById(decodedPayload.userId).select("name");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Welcome to the home page!",
      name: user.name,
    });
  });
});

app.get("/api/users", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, "abcd123489ybehbg") as { userId: string };

    // Fetch all users except the logged-in user
    const users = await User.find({ _id: { $ne: decoded.userId } }).select(
      "_id name"
    );

    res.status(200).json(users);
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
