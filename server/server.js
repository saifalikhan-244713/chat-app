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
// });
var express = require("express");
var mongoose_1 = require("mongoose");
var dotenv = require("dotenv");
var cors = require("cors");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
dotenv.config();
var app = express();
var PORT = process.env.PORT || 5000;
// Middleware
app.use(express.json());
app.use(cors());
// MongoDB Connection
mongoose_1.default
    .connect("mongodb+srv://saifkhanali101:UK18b7343@cluster0.lvgws.mongodb.net/chatter?retryWrites=true&w=majority&appName=Cluster0")
    .then(function () { return console.log("MongoDB connected"); })
    .catch(function (err) { return console.log(err); });
var userSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
var User = mongoose_1.default.model("User", userSchema);
// Signup Route
app.post("/signup", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, email, password, existingUser, hashedPassword, newUser;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, email = _a.email, password = _a.password;
                return [4 /*yield*/, User.findOne({ email: email })];
            case 1:
                existingUser = _b.sent();
                if (existingUser) {
                    return [2 /*return*/, res.status(400).json({ message: "User already exists" })];
                }
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 2:
                hashedPassword = _b.sent();
                newUser = new User({ name: name, email: email, password: hashedPassword });
                return [4 /*yield*/, newUser.save()];
            case 3:
                _b.sent();
                return [2 /*return*/, res.status(201).json({ message: "User registered successfully" })];
        }
    });
}); });
// Login Route (Now includes name in the JWT)
app.post("/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, isMatch, token;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                return [4 /*yield*/, User.findOne({ email: email })];
            case 1:
                user = _b.sent();
                if (!user) {
                    return [2 /*return*/, res.status(400).json({ message: "Invalid credentials" })];
                }
                return [4 /*yield*/, bcrypt.compare(password, user.password)];
            case 2:
                isMatch = _b.sent();
                if (!isMatch) {
                    return [2 /*return*/, res.status(400).json({ message: "Invalid credentials" })];
                }
                token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET || "secret_key", { expiresIn: "1h" });
                return [2 /*return*/, res.status(200).json({ token: token, name: user.name })];
        }
    });
}); });
app.get("/home", function (req, res) {
    var _a;
    var token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return res.status(403).json({ message: "No token provided" });
    }
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", function (err, decoded) { return __awaiter(void 0, void 0, void 0, function () {
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
                    if (!user) {
                        return [2 /*return*/, res.status(404).json({ message: "User not found" })];
                    }
                    res.status(200).json({
                        message: "Welcome to the home page!",
                        name: user.username,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
app.get("/api/users", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decoded, users, err_1;
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
                decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
                return [4 /*yield*/, User.find({ _id: { $ne: decoded.userId } }).select("_id name")];
            case 2:
                users = _b.sent();
                res.status(200).json(users);
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                res.status(403).json({ message: "Invalid or expired token" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Start Server
app.listen(PORT, function () {
    console.log("Server started on http://localhost:".concat(PORT));
});
