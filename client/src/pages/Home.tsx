import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  TextField,
  Button,
} from "@mui/material";

interface User {
  _id: string;
  name: string;
}

interface ChatMessage {
  _id?: string;
  content: string;
  from: User;
  to: User;
}

const Home = () => {
  const [name, setName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    const token = localStorage.getItem("token");
    socketRef.current.on("connect", () => {
      console.log("Socket connected!");
      setSocketConnected(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (userId) {
        console.log("Registering with userId:", userId);
        socketRef.current?.emit("register", userId);
      }
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected!");
      setSocketConnected(false);
    });

    axios
      .get("http://localhost:5000/home", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setName(res.data.name);
        socketRef.current?.emit("join", res.data.userId);
      })
      .catch((err) => console.log("Error fetching user info:", err));

    axios
      .get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => console.log("Error fetching users:", err));

    socketRef.current?.on("receiveMessage", (incomingMessage: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, incomingMessage]);
    });
    return () => {
      socketRef.current?.disconnect();
      setSocketConnected(false);
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const token = localStorage.getItem("token");
      axios
        .get(`http://localhost:5000/api/messages/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setMessages(res.data);
        })
        .catch((err) => console.log("Error fetching messages:", err));
    }
  }, [selectedUser]);

  const handleSendMessage = () => {
    if (
      message.trim() &&
      selectedUser &&
      socketRef.current &&
      socketConnected
    ) {
      console.log("Emitting sendMessage event:", {
        from: localStorage.getItem("userId"),
        to: selectedUser._id,
        message,
      });
      console.log(
        "Sending message with from:",
        localStorage.getItem("userId"),
        "and to:",
        selectedUser._id
      );
      socketRef.current.emit("sendMessage", {
        // Correct event name
        from: localStorage.getItem("userId"),
        to: selectedUser._id,
        message,
      });
      const fromUser: User = {
        // Type the fromUser object
        _id: localStorage.getItem("userId") || "",
        name: name, // Use the name from the component's state
      };

      const tempMessage: ChatMessage = {
        content: message,
        from: fromUser, // Use the correctly typed fromUser object
        to: selectedUser,
      };

      setMessages((prevMessages) => [...prevMessages, tempMessage]);
      setMessage("");
    } else {
      console.log("Conditions not met for sending message");
    }
  };
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };

  return (
    <Container maxWidth="lg" style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar for Users */}
      <Box
        sx={{
          width: "30%",
          height: "100%",
          backgroundColor: "#f5f5f5",
          overflowY: "auto",
          padding: "10px",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Users
        </Typography>
        <List sx={{ width: "300px", maxWidth: 360 }}>
          {users.map((user) => (
            <ListItem
              component="div"
              button
              key={user._id}
              onClick={() => handleSelectUser(user)}
            >
              <ListItemText primary={user.name} />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Chat Section */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          borderLeft: "1px solid #ddd",
        }}
      >
        {selectedUser ? (
          <>
            <Typography variant="h5" gutterBottom>
              {selectedUser.name}
            </Typography>
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "10px",
                minHeight: "300px",
                overflowY: "auto",
              }}
            >
              {messages.map((msg, index) => {
                const sender = msg.from?.name ?? "Unknown";
                return (
                  <Box
                    key={index}
                    sx={{
                      marginBottom: "5px",
                      padding: "8px",
                      borderRadius: "4px",
                      backgroundColor: "#e0e0e0",
                    }}
                  >
                    <Typography variant="body1">
                      {sender}: {msg.content}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                marginTop: "auto",
              }}
            >
              <TextField
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                label="Type a message"
                variant="outlined"
                fullWidth
                sx={{ marginRight: "10px" }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
              >
                Send
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="h6">Select a user to start chatting</Typography>
        )}
      </Box>
    </Container>
  );
};

export default Home;
