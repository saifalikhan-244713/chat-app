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
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT;
const url = process.env.URL;
app.use(require("express").json());
app.use(
  cors({
    origin: url,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

let users: { userId: string; socketId: string }[] = [];

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("MONGODB_URI is not defined in the environment variables.");
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const jwtSecret = process.env.JWT_SECRET;

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
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    groupId: { type: String, unique: true, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);


app.post("/signup", async (req: Request, res: Response) => {
  const { name, email, password }: { name: string; email: string; password: string } = req.body;
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
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Login Endpoint
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
    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, jwtSecret, { expiresIn: "1h" });
    return res.status(200).json({ token, name: user.name, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Get All Groups
app.get("/api/groups", async (req: Request, res: Response) => {
  try {
    const groups = await Group.find().populate("members", "name");
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: "Error fetching groups", error });
  }
});

// Get Groups for a Specific User
app.get("/api/groups/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const groups = await Group.find({ members: userId }).populate("members", "name");
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups", error });
  }
});


app.post("/api/groups", async (req: Request, res: Response) => {
  const { name, members, createdBy } = req.body;
  if (!name || !members || members.length < 2) {
    return res.status(400).json({ message: "A group must have at least two members." });
  }
  let updatedMembers = members;
  if (!members.includes(createdBy)) {
    updatedMembers.push(createdBy);
  }
  const groupId = new mongoose.Types.ObjectId(); 
  console.log("groupId:", groupId);
  try {
    const newGroup = new Group({ name, groupId, members: updatedMembers, createdBy });
    console.log("newGroup:", newGroup);
    await newGroup.save();
    console.log("New group created:", newGroup);
    res.status(201).json(newGroup);
    newGroup.members.forEach((memberId: any) => {
      const socketId = userSocketMap.get(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("newGroup", newGroup);
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating group", error });
  }
});

app.post("/api/messages/group", async (req: Request, res: Response) => {
  const { from, group, content } = req.body; 
  try {
    const newMessage = new Message({ from, group, content });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Error sending group message", error });
  }
});

app.get("/api/messages/group/:groupId", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const messages = await Message.find({ group: groupId })
      .populate("from", "name")
      .populate("group", "name");
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching group messages", error });
  }
});


app.get("/home", (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }
  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    const decodedPayload = decoded as { userId: string };
    const user = await User.findById(decodedPayload.userId).select("name");
    res.status(200).json({ message: "Welcome to the home page!", name: user.name });
  });
});

app.get("/api/users", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as unknown;
    const { userId } = decoded as { userId: string };
    const usersList = await User.find({ _id: { $ne: userId } }).select("_id name");
    res.status(200).json(usersList);
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
});

app.get("/api/messages/:userId", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const decoded = jwt.verify(token, jwtSecret) as unknown;
    const { userId } = decoded as { userId: string };
    console.log("Decoded userId:", userId);
    const messages = await Message.find({
      $or: [
        { from: userId, to: req.params.userId },
        { to: userId, from: req.params.userId },
      ],
    })
      .populate("from", "name")
      .populate("to", "name");
    console.log("Messages sent from server:", messages);
    res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({ message: "Error verifying token", error: err });
  }
});


const userSocketMap = new Map<string, string>();

io.on("connection", (socket: Socket) => {
  console.log("User connected, socket id:", socket.id);

  socket.on("register", (userId: string) => {
    console.log(`User ${userId} registered with socket id ${socket.id}`);
    userSocketMap.set(userId.toString(), socket.id);
  });

  socket.on("join", (userId: string) => {
    console.log(`User ${userId} joined with socket id ${socket.id}`);
    users.push({ userId, socketId: socket.id });
  });

  socket.on("sendMessage", async (data) => {
    const { from, to, message } = data;
    try {
      const newMessage = new Message({ from, to, content: message });
      await newMessage.save();
      await newMessage.populate("from", "name");
      await newMessage.populate("to", "name");
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", newMessage);
      }
    } catch (error) {
      console.error("Error saving/sending message:", error);
    }
  });

  socket.on("joinGroup", (groupId: string) => {
    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  socket.on("sendGroupMessage", async (data) => {
    const { from, group, message } = data;
    try {
      const newMessage = new Message({ from, group, content: message });
      await newMessage.save();
      await newMessage.populate("from", "name");
      io.to(group).emit("receiveGroupMessage", newMessage);
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  });

  socket.on("disconnect", () => {
    userSocketMap.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
