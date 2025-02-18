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
  from: string | User;
  to: string;
}

const Home = () => {
  const [name, setName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Create the socket only once using a ref
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection only once
    socketRef.current = io("http://localhost:5000");
    const token = localStorage.getItem("token");

    // Fetch logged-in user's name and userId
    axios
      .get("http://localhost:5000/home", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setName(res.data.name);
        // Emit join with userId (assumed stored in localStorage after login)
        socketRef.current?.emit("join", res.data.userId);
      })
      .catch((err) => console.log("Error fetching user info:", err));

    // Fetch all users except logged-in user
    axios
      .get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => console.log("Error fetching users:", err));

    // Listen for incoming messages
    socketRef.current?.on("receiveMessage", (incomingMessage: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, incomingMessage]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []); // run once

  // When a user is selected, fetch the conversation from the backend
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
    if (message.trim() && selectedUser && socketRef.current) {
      // Send message using the userId stored in localStorage
      socketRef.current.emit("sendMessage", {
        from: localStorage.getItem("userId"),
        to: selectedUser._id,
        message,
      });
      // Optionally, update UI optimistically
      setMessages((prevMessages) => [
        ...prevMessages,
        { content: message, from: name, to: selectedUser.name },
      ]);
      setMessage("");
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
                // If msg.from is an object, use its name property; otherwise, assume it's a string.
                const sender =
                  typeof msg.from === "object" && msg.from.name
                    ? msg.from.name
                    : msg.from;
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
