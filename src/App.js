import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
// import Room from './pages/Room';

const App = () => {
  return (
    <BrowserRouter>
        <Routes>
            <Route exact path="/" element={<Home />}/>
            {/* <Route path="/room/:roomId" element={<Room />} /> */}
        </Routes>
    </BrowserRouter>
  );
}

export default App;