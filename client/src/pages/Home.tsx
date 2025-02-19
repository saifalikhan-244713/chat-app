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
  Divider,
  Select,
  MenuItem,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";

interface User {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  members: User[];
}

interface ChatMessage {
  _id?: string;
  content: string;
  from: User;
  to?: User;
  group?: Group;
}

const Home = () => {
  // const [name, setName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_APP_SOCKET_URL as string);
    const token = localStorage.getItem("token");
    socketRef.current.on("connect", () => {
      setSocketConnected(true);
      const userId = localStorage.getItem("userId");
      if (userId) {
        socketRef.current?.emit("register", userId);
      }
    });

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data));

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setGroups(res.data));

    socketRef.current?.on("receiveMessage", (incomingMessage: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, incomingMessage]);
    });

    socketRef.current?.on(
      "receiveGroupMessage",
      (incomingMessage: ChatMessage) => {
        setMessages((prevMessages) => [...prevMessages, incomingMessage]);
      }
    );

    return () => {
      socketRef.current?.disconnect();
      setSocketConnected(false);
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() && socketRef.current && socketConnected) {
      if (selectedUser) {
        socketRef.current.emit("sendMessage", {
          from: localStorage.getItem("userId"),
          to: selectedUser._id,
          message,
        });
      } else if (selectedGroup) {
        socketRef.current.emit("sendGroupMessage", {
          from: localStorage.getItem("userId"),
          group: selectedGroup._id,
          message,
        });
      }
      setMessage("");
    }
  };

  const createGroup = () => {
    console.log("Creating group with:", newGroupName, newGroupMembers);

    const token = localStorage.getItem("token");
    if (token) {
      console.log("Token found");
    }
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      console.log("Decoded Token:", decodedToken); // Check the token structure
      const userId = decodedToken?.userId; // Use 'userId' as per backend
      console.log("User ID:", userId);

      axios
        .post(
          `${import.meta.env.VITE_API_URL}/api/groups`,
          {
            name: newGroupName,
            members: newGroupMembers,
            createdBy: userId,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setGroups([...groups, res.data]);
          console.log("Group created successfully:", res.data);
          setNewGroupName("");
          setNewGroupMembers([]);
        })
        .catch((err) => console.error("Error posting group members", err));
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  };

  return (
    <Container maxWidth="lg" style={{ display: "flex", height: "100vh" }}>
      <Box sx={{ width: "30%", padding: "10px", backgroundColor: "#f5f5f5" }}>
        <Typography variant="h6">Users</Typography>
        <List>
          {users.map((user) => (
            <ListItem
              button
              key={user._id}
              onClick={() => setSelectedUser(user)}
            >
              <ListItemText primary={user.name} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ marginY: 2 }} />
        <Typography variant="h6">Groups</Typography>
        <List>
          {groups.map((group) => (
            <ListItem
              button
              key={group._id}
              onClick={() => setSelectedGroup(group)}
            >
              <ListItemText primary={group.name} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ marginY: 2 }} />
        <Typography variant="h6">Create Group</Typography>
        <TextField
          label="Group Name"
          fullWidth
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <Select
          multiple
          fullWidth
          value={newGroupMembers}
          onChange={(e) => setNewGroupMembers(e.target.value as string[])}
        >
          {users.map((user) => (
            <MenuItem key={user._id} value={user._id}>
              {user.name}
            </MenuItem>
          ))}
        </Select>
        <Button
          fullWidth
          variant="contained"
          sx={{ marginTop: 2 }}
          onClick={createGroup}
        >
          Create
        </Button>
      </Box>

      <Box sx={{ flex: 1, padding: "20px", borderLeft: "1px solid #ddd" }}>
        {selectedUser || selectedGroup ? (
          <>
            <Typography variant="h5">
              {selectedUser?.name || selectedGroup?.name}
            </Typography>
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "8px",
                minHeight: "300px",
                overflowY: "auto",
              }}
            >
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    padding: "8px",
                    borderRadius: "4px",
                    backgroundColor: "#e0e0e0",
                    marginBottom: "5px",
                  }}
                >
                  <Typography>
                    {msg.from.name}: {msg.content}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", marginTop: "10px" }}>
              <TextField
                fullWidth
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button variant="contained" onClick={sendMessage}>
                Send
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="h6">
            Select a user or group to start chatting
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default Home;
