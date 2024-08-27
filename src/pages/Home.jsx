import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleEnterRoom = () => {
    if (nickname && roomId) {
      navigate(`/room/${roomId}`, { state: { nickname } });
    }
  };

  return (
    <div>
      <h1>방 입장</h1>
      <input 
        type="text" 
        placeholder="닉네임" 
        value={nickname} 
        onChange={(e) => setNickname(e.target.value)} 
      />
      <input 
        type="text" 
        placeholder="방 번호" 
        value={roomId} 
        onChange={(e) => setRoomId(e.target.value)} 
      />
      <button onClick={handleEnterRoom}>입장</button>
    </div>
  );
}

export default Home;