"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var mongoose_1 = require("mongoose");
var dotenv = require("dotenv");
var cors = require("cors");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var socket_io_1 = require("socket.io");
dotenv.config();
var app = require("express")();
var server = http.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
var PORT = process.env.PORT;
var url = process.env.URL;
app.use(require("express").json());
app.use(cors({
    origin: url,
    methods: ["GET", "POST"],
    credentials: true,
}));
var users = [];
var mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
}
mongoose_1.default
    .connect(mongoUri)
    .then(function () { return console.log("MongoDB connected"); })
    .catch(function (err) { return console.error("MongoDB connection error:", err); });
var jwtSecret = process.env.JWT_SECRET;
var userSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
var User = mongoose_1.default.model("User", userSchema);
var messageSchema = new mongoose_1.default.Schema({
    from: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", default: null },
    group: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
    },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
var Message = mongoose_1.default.model("Message", messageSchema);
var groupSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    groupId: { type: String, unique: true, required: true },
    members: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });
var Group = mongoose_1.default.model("Group", groupSchema);
app.post("/signup", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, email, password, existingUser, hashedPassword, newUser, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, email = _a.email, password = _a.password;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, User.findOne({ email: email })];
            case 2:
                existingUser = _b.sent();
                if (existingUser) {
                    return [2 /*return*/, res.status(400).json({ message: "User already exists" })];
                }
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 3:
                hashedPassword = _b.sent();
                newUser = new User({ name: name, email: email, password: hashedPassword });
                return [4 /*yield*/, newUser.save()];
            case 4:
                _b.sent();
                return [2 /*return*/, res.status(201).json({ message: "User registered successfully" })];
            case 5:
                err_1 = _b.sent();
                console.error(err_1);
                res.status(500).json({ message: "Server error", error: err_1 });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Login Endpoint
app.post("/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, isMatch, token, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, User.findOne({ email: email })];
            case 2:
                user = _b.sent();
                if (!user) {
                    return [2 /*return*/, res.status(400).json({ message: "Invalid credentials" })];
                }
                return [4 /*yield*/, bcrypt.compare(password, user.password)];
            case 3:
                isMatch = _b.sent();
                if (!isMatch) {
                    return [2 /*return*/, res.status(400).json({ message: "Invalid credentials" })];
                }
                token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, jwtSecret, { expiresIn: "1h" });
                return [2 /*return*/, res.status(200).json({ token: token, name: user.name, userId: user._id })];
            case 4:
                err_2 = _b.sent();
                console.error(err_2);
                res.status(500).json({ message: "Server error", error: err_2 });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Get All Groups
app.get("/api/groups", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var groups, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Group.find().populate("members", "name")];
            case 1:
                groups = _a.sent();
                res.status(200).json(groups);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                res.status(500).json({ message: "Error fetching groups", error: error_1 });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get Groups for a Specific User
app.get("/api/groups/:userId", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, groups, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = req.params.userId;
                return [4 /*yield*/, Group.find({ members: userId }).populate("members", "name")];
            case 1:
                groups = _a.sent();
                res.status(200).json(groups);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("Error fetching groups:", error_2);
                res.status(500).json({ message: "Error fetching groups", error: error_2 });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post("/api/groups", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, members, createdBy, updatedMembers, groupId, newGroup_1, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, members = _a.members, createdBy = _a.createdBy;
                if (!name || !members || members.length < 2) {
                    return [2 /*return*/, res.status(400).json({ message: "A group must have at least two members." })];
                }
                updatedMembers = members;
                if (!members.includes(createdBy)) {
                    updatedMembers.push(createdBy);
                }
                groupId = new mongoose_1.default.Types.ObjectId();
                console.log("groupId:", groupId);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                newGroup_1 = new Group({ name: name, groupId: groupId, members: updatedMembers, createdBy: createdBy });
                console.log("newGroup:", newGroup_1);
                return [4 /*yield*/, newGroup_1.save()];
            case 2:
                _b.sent();
                console.log("New group created:", newGroup_1);
                res.status(201).json(newGroup_1);
                newGroup_1.members.forEach(function (memberId) {
                    var socketId = userSocketMap.get(memberId.toString());
                    if (socketId) {
                        io.to(socketId).emit("newGroup", newGroup_1);
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                res.status(500).json({ message: "Error creating group", error: error_3 });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post("/api/messages/group", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, from, group, content, newMessage, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, from = _a.from, group = _a.group, content = _a.content;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                newMessage = new Message({ from: from, group: group, content: content });
                return [4 /*yield*/, newMessage.save()];
            case 2:
                _b.sent();
                res.status(201).json(newMessage);
                return [3 /*break*/, 4];
            case 3:
                error_4 = _b.sent();
                res.status(500).json({ message: "Error sending group message", error: error_4 });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get("/api/messages/group/:groupId", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var groupId, messages, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                groupId = req.params.groupId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Message.find({ group: groupId })
                        .populate("from", "name")
                        .populate("group", "name")];
            case 2:
                messages = _a.sent();
                res.status(200).json(messages);
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                res.status(500).json({ message: "Error fetching group messages", error: error_5 });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get("/home", function (req, res) {
    var _a;
    var token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return res.status(403).json({ message: "No token provided" });
    }
    jwt.verify(token, jwtSecret, function (err, decoded) { return __awaiter(void 0, void 0, void 0, function () {
        var decodedPayload, user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (err) {
                        return [2 /*return*/, res.status(403).json({ message: "Invalid or expired token" })];
                    }
                    decodedPayload = decoded;
                    return [4 /*yield*/, User.findById(decodedPayload.userId).select("name")];
                case 1:
                    user = _a.sent();
                    res.status(200).json({ message: "Welcome to the home page!", name: user.name });
                    return [2 /*return*/];
            }
        });
    }); });
});
app.get("/api/users", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decoded, userId, usersList, err_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
                if (!token) {
                    return [2 /*return*/, res.status(403).json({ message: "No token provided" })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                decoded = jwt.verify(token, jwtSecret);
                userId = decoded.userId;
                return [4 /*yield*/, User.find({ _id: { $ne: userId } }).select("_id name")];
            case 2:
                usersList = _b.sent();
                res.status(200).json(usersList);
                return [3 /*break*/, 4];
            case 3:
                err_3 = _b.sent();
                return [2 /*return*/, res.status(403).json({ message: "Invalid or expired token" })];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get("/api/messages/:userId", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decoded, userId, messages, err_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                decoded = jwt.verify(token, jwtSecret);
                userId = decoded.userId;
                console.log("Decoded userId:", userId);
                return [4 /*yield*/, Message.find({
                        $or: [
                            { from: userId, to: req.params.userId },
                            { to: userId, from: req.params.userId },
                        ],
                    })
                        .populate("from", "name")
                        .populate("to", "name")];
            case 2:
                messages = _b.sent();
                console.log("Messages sent from server:", messages);
                res.status(200).json(messages);
                return [3 /*break*/, 4];
            case 3:
                err_4 = _b.sent();
                return [2 /*return*/, res.status(500).json({ message: "Error verifying token", error: err_4 })];
            case 4: return [2 /*return*/];
        }
    });
}); });
var userSocketMap = new Map();
io.on("connection", function (socket) {
    console.log("User connected, socket id:", socket.id);
    socket.on("register", function (userId) {
        console.log("User ".concat(userId, " registered with socket id ").concat(socket.id));
        userSocketMap.set(userId.toString(), socket.id);
    });
    socket.on("join", function (userId) {
        console.log("User ".concat(userId, " joined with socket id ").concat(socket.id));
        users.push({ userId: userId, socketId: socket.id });
    });
    socket.on("sendMessage", function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var from, to, message, newMessage, recipientSocketId, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    from = data.from, to = data.to, message = data.message;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    newMessage = new Message({ from: from, to: to, content: message });
                    return [4 /*yield*/, newMessage.save()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, newMessage.populate("from", "name")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, newMessage.populate("to", "name")];
                case 4:
                    _a.sent();
                    recipientSocketId = userSocketMap.get(to);
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("receiveMessage", newMessage);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_6 = _a.sent();
                    console.error("Error saving/sending message:", error_6);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    socket.on("joinGroup", function (groupId) {
        socket.join(groupId);
        console.log("User joined group: ".concat(groupId));
    });
    socket.on("sendGroupMessage", function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var from, group, message, newMessage, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    from = data.from, group = data.group, message = data.message;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    newMessage = new Message({ from: from, group: group, content: message });
                    return [4 /*yield*/, newMessage.save()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, newMessage.populate("from", "name")];
                case 3:
                    _a.sent();
                    io.to(group).emit("receiveGroupMessage", newMessage);
                    return [3 /*break*/, 5];
                case 4:
                    error_7 = _a.sent();
                    console.error("Error sending group message:", error_7);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    socket.on("disconnect", function () {
        userSocketMap.forEach(function (socketId, userId) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
            }
        });
    });
});
server.listen(PORT, function () {
    console.log("Server started on http://localhost:".concat(PORT));
});
