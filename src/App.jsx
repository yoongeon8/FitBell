import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Homepage from './component/homepage';
import Login from './component/login';
import Diet from './component/diet';
import Signup from './component/signup'
import './css_file/main.css';

function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/diet" element={<Diet />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
