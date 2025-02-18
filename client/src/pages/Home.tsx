import { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
} from "@mui/material";

const Home = () => {
  const [name, setName] = useState("");
  const [users, setUsers] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Fetch logged-in user's name
    axios
      .get("http://localhost:5000/home", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setName(res.data.name))
      .catch((err) => console.log(err));

    // Fetch all users except logged-in user
    axios
      .get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.log(err));
  }, []);

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
        <List>
          {users.map((user) => (
            <ListItem
              button
              key={user._id}
              onClick={() => console.log("Chat with:", user.name)}
            >
              <ListItemText primary={user.name} />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Chat Section */}
      <Box sx={{ flex: 1, padding: "20px" }}>
        <Typography variant="h4">Welcome {name}</Typography>
      </Box>
    </Container>
  );
};

export default Home;
