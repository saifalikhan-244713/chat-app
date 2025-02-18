import { Request, Response } from "express";
import http = require("http");
import mongoose from "mongoose";
import dotenv = require("dotenv");
import cors = require("cors");
import bcrypt = require("bcryptjs");
import * as jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";

dotenv.config();

const app = require("express")();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or specify your frontend URL
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(require("express").json());
app.use(
  cors({
    origin: "http://localhost:5173", // Allow your frontend to make requests
    methods: ["GET", "POST"],
    credentials: true,
  })
);
let users: { userId: string; socketId: string }[] = []; // Store users and their socket IDs

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb+srv://saifkhanali101:UK18b7343@cluster0.lvgws.mongodb.net/chatter?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

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

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

// Signup Route
app.post("/signup", async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
  }: { name: string; email: string; password: string } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login Route
app.post("/login", async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token with name and include userId in response
    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET || "abcd123489ybehbg",
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token, name: user.name, userId: user._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Home Route
app.get("/home", (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }
  jwt.verify(
    token,
    process.env.JWT_SECRET || "abcd123489ybehbg",
    async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      const decodedPayload = decoded as { userId: string };
      const user = await User.findById(decodedPayload.userId).select("name");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res
        .status(200)
        .json({ message: "Welcome to the home page!", name: user.name });
    }
  );
});

// Get All Users Route
app.get("/api/users", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "abcd123489ybehbg"
    ) as { userId: string };
    const usersList = await User.find({ _id: { $ne: decoded.userId } }).select(
      "_id name"
    );
    res.status(200).json(usersList);
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
});
const userSocketMap = new Map<string, string>();
io.on("connection", (socket: Socket) => {
  console.log("User connected, socket id:", socket.id);

  socket.on("join", (userId: string) => {
    console.log(`User ${userId} joined with socket id ${socket.id}`);
    users.push({ userId, socketId: socket.id });
  });
  const socketToUser: { [socketId: string]: string } = {}; // Maps socketId to userId
  const userToSocket: { [userId: string]: string } = {}; // Maps userId to socketId

  io.on("connection", (socket) => {
    socket.on("register", (userId: string) => {
      console.log(`User ${userId} registered with socket id ${socket.id}`);
      userSocketMap.set(userId.toString(), socket.id);
    });
  });
  socket.on("sendMessage", async (data) => {
    const { from, to, message } = data;
    try {
      const newMessage = new Message({ from, to, content: message });
      await newMessage.save();

      const populatedMessage = await newMessage.save();
      await populatedMessage.populate("from", "name");
      await populatedMessage.populate("to", "name");

      console.log("Message saved:", populatedMessage);

      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", populatedMessage);
      } else {
        console.log(`Recipient ${to} not connected`);
      }
    } catch (error) {
      console.error("Error saving/sending message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected, socket id:", socket.id);
    userSocketMap.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        return;
      }
    });
  });
});

// Get Messages Between Two Users
app.get("/api/messages/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "abcd123489ybehbg"
    ) as { userId: string };

    const messages = await Message.find({
      $or: [
        { from: decoded.userId, to: userId },
        { from: userId, to: decoded.userId },
      ],
    })
      .populate("from", "name")
      .populate("to", "name");

    if (!messages.length) {
      return res.status(404).json({ message: "Messages not found" });
    }

    // Debugging: Check if messages contain populated user names
    console.log("Fetched messages:", messages);

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
});

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.send("Server is running");
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
