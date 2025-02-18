import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "../src/pages/Login";
import Home from "../src/pages/Home";
import Signup from "./pages/Signup";

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  </Router>
);
export default App;
