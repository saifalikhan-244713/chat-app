import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import SendIcon from "@mui/icons-material/Send";
import bg from "../pages/chatbg.jpg";
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
  FormControl,
  InputLabel,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

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
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [loggedInUserName, setLoggedInUserName] = useState("");
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (selectedUser) {
      const token = localStorage.getItem("token");
      axios
        .get(
          `${import.meta.env.VITE_API_URL}/api/messages/${selectedUser._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setMessages(res.data);
          console.log("Fetched messages:", res.data);
        })
        .catch((err) => console.log("Error fetching messages:", err));
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedGroup) {
      const token = localStorage.getItem("token");
      axios
        .get(
          `${import.meta.env.VITE_API_URL}/api/messages/group/${
            selectedGroup._id
          }`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setMessages(res.data);
          console.log("Fetched group messages:", res.data);
        })
        .catch((err) => console.log("Error fetching group messages:", err));
    }
    if (selectedGroup && socketRef.current) {
      socketRef.current.emit("joinGroup", selectedGroup._id);
    }
  }, [selectedGroup]);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_APP_SOCKET_URL as string);
    const token = localStorage.getItem("token");
    if (token) {
      const decodedToken: any = token ? jwtDecode(token) : null;
      setLoggedInUserName(decodedToken.name);
    }
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

    const decodedToken: any = token ? jwtDecode(token) : null;
    const userId = decodedToken?.userId || "";
    console.log("Logged-in user ID:", userId);

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/groups/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("Fetched groups for user:", res.data);
        setGroups(res.data);
      })
      .catch((err) => console.error("Error fetching groups:", err));

    socketRef.current?.on("receiveMessage", (incomingMessage: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, incomingMessage]);
    });

    socketRef.current?.on(
      "receiveGroupMessage",
      (incomingMessage: ChatMessage) => {
        setMessages((prevMessages) => [...prevMessages, incomingMessage]);
      }
    );
    const handleNewGroup = (group: Group) => {
      const userId = localStorage.getItem("userId");
      // Check if the logged-in user is a member of the group.
      // If group.members is not populated with objects, compare using toString.
      setGroups((prevGroups) => {
        const alreadyAdded = prevGroups.some((g) => g._id === group._id);
        const isMember = group.members.some(
          (member: any) =>
            member.toString() === userId ||
            (member._id && member._id === userId)
        );
        if (!alreadyAdded && isMember) {
          return [...prevGroups, group];
        }
        return prevGroups;
      });
    };

    socketRef.current?.on("newGroup", handleNewGroup);

    return () => {
      socketRef.current?.off("newGroup", handleNewGroup);
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
        const token = localStorage.getItem("token");
        const decodedToken: any = token ? jwtDecode(token) : null;
        const fromUser: User = {
          _id: localStorage.getItem("userId") || "",
          name: decodedToken?.name || "Unknown",
        };
        const tempMessage: ChatMessage = {
          content: message,
          from: fromUser,
          to: selectedUser,
        };
        setMessages((prevMessages) => [...prevMessages, tempMessage]);
        setMessage("");
      } else if (selectedGroup) {
        socketRef.current.emit("sendGroupMessage", {
          from: localStorage.getItem("userId"),
          group: selectedGroup._id,
          message,
        });
        // Removed axios POST for group messages to avoid duplicate emission
        setMessage("");
      }
    }
  };

  const createGroup = () => {
    console.log("Creating group with:", newGroupName, newGroupMembers);
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }
    try {
      const decodedToken: any = jwtDecode(token);
      const userId = decodedToken?.userId;
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
          if (res.data.members.includes(userId)) {
            setGroups((prevGroups) => [...prevGroups, res.data]);
            console.log("Group added:", res.data);
          } else {
            console.log("User is NOT a member, group NOT added.");
          }
          setNewGroupName("");
          setNewGroupMembers([]);
        })
        .catch((err) => console.error("Error posting group members", err));
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  };

  return (
    <Container
      maxWidth="lg"
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        maxHeight: "100vh",
      }}
    >
      <Box
        sx={{
          maxHeight: "100vh",
          width: "30%",
          overflowY: "auto",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        {/* Users Section */}
        <Box
          sx={{
            backgroundColor: "#212121",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
            Users
          </Typography>
        </Box>
        <List sx={{ marginTop: "10px" }}>
          {users.map((user) => (
            <ListItem
              button
              key={user._id}
              onClick={() => {
                setSelectedUser(user);
                setSelectedGroup(null);
              }}
              sx={{
                backgroundColor: "#fff",
                marginBottom: "5px",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#e0e0e0",
                },
              }}
            >
              <ListItemText primary={user.name} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ marginY: 2 }} />

        {/* Groups Section */}
        <Box
          sx={{
            backgroundColor: "#212121",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
            Groups
          </Typography>
        </Box>
        <List sx={{ marginTop: "10px" }}>
          {groups.map((group) => (
            <ListItem
              button
              key={group._id}
              onClick={() => {
                setSelectedGroup(group);
                setSelectedUser(null);
              }}
              sx={{
                backgroundColor: "#fff",
                marginBottom: "5px",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#e0e0e0",
                },
              }}
            >
              <ListItemText primary={group.name} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ marginY: 2 }} />

        {/* Create Group Section */}
        <Box
          sx={{
            backgroundColor: "#212121",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
            Create Group
          </Typography>
        </Box>
        <TextField
          label="Group Name"
          fullWidth
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          sx={{ marginTop: 2 }}
        />
        <FormControl fullWidth sx={{ marginTop: 2 }}>
          <InputLabel>Select Group Members</InputLabel>
          <Select
            multiple
            value={newGroupMembers}
            onChange={(e) => setNewGroupMembers(e.target.value as string[])}
          >
            {users.map((user) => (
              <MenuItem key={user._id} value={user._id}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          fullWidth
          variant="contained"
          sx={{
            marginTop: 2,
            backgroundColor: "#212121",
            "&:hover": { backgroundColor: "#333" },
          }}
          onClick={createGroup}
        >
          Create
        </Button>
      </Box>

      <Box sx={{ flex: 1, borderLeft: "1px solid #ddd" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            padding: "20px 10px",
            backgroundColor: "#128C7E",
            color: "white",
          }}
        >
          <Typography variant="h5" sx={{ textAlign: "center", widt: "100vw" }}>
            {loggedInUserName.charAt(0).toUpperCase() +
              loggedInUserName.slice(1)}
          </Typography>
          <Button
            variant="contained"
            component="button"
            sx={{ backgroundColor: "#f5f5f5", color: "#128C7E" }}
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("userId");
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </Box>
        {selectedUser || selectedGroup ? (
          <>
            {" "}
            <Box
              sx={{
                flex: 1,
                backgroundImage: `url(${bg})`,

                padding: "10px",
                borderRadius: "0",
                minHeight: "74vh",
                overflowY: "auto",
              }}
            >
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    position: "relative",
                    marginLeft:
                      msg.from._id === localStorage.getItem("userId")
                        ? "auto"
                        : "0",
                    marginRight: "0",
                    padding: "4px",
                    paddingRight:
                      msg.from._id === localStorage.getItem("userId")
                        ? "10px"
                        : "20px",
                    paddingLeft:
                      msg.from._id === localStorage.getItem("userId")
                        ? "20px"
                        : "10px",
                    borderRadius: "4px",
                    width: "fit-content",
                    backgroundColor:
                      msg.from._id === localStorage.getItem("userId")
                        ? "#cdffdd"
                        : "white",
                    color: "black",
                    marginBottom: "5px",
                  }}
                >
                  <Typography>{msg.content}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <TextField
                fullWidth
                label={
                  <Typography>
                    Chat with {selectedUser?.name || selectedGroup?.name}
                  </Typography>
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 0,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderRight: 0,
                  },
                }}
              />

              <Button
                variant="contained"
                sx={{
                  boxShadow: 0,
                  border: "1px solid rgb(197, 193, 193)",
                  borderLeft: 0,
                  backgroundColor: "white",
                  borderRadius: 0,
                  height: "55px",
                }}
                onClick={sendMessage}
              >
                <SendIcon
                  sx={{
                    fontSize: "30px",
                    color: "#128C7E",
                  }}
                />
              </Button>
            </Box>
          </>
        ) : (
          <>
            {/* <Typography variant="h6">
              Select a user or group to start chatting
            </Typography> */}
          </>
        )}
      </Box>
    </Container>
  );
};

export default Home;
