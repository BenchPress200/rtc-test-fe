import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (roomId.trim() !== '') {
        navigate(`/room/${roomId}`);
    }
  };

  return (
    <div>
      <h1>Enter Room</h1>
      <input
        type="text"
        placeholder="Enter room number"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={handleJoinRoom}>Join</button>
    </div>
  );
}

export default Home;