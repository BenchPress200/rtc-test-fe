import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Welcome.module.css';

const Welcome = () => {
    const [ws, setWs] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [nickname, setNickname] = useState('');
    const navigate = useNavigate();
    
    const handleCreateRoom = () => {
        const newRoomId = Math.floor(Math.random() * 10000);
        setRoomId(newRoomId.toString());
        alert(`Room ${newRoomId} created. Share this number with participants.`);
    };
    
    const handleJoinRoom = () => {
        if (roomId && nickname) {
            navigate(`/main?roomId=${roomId}&nickname=${nickname}`);
        } else {
            alert('Please enter both room number and nickname.');
        }
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'roomId') setRoomId(value);
        if (name === 'nickname') setNickname(value);
    };

    return (
        <>
            <div className={styles.WelcomeBody}>
                <div className={styles.InputBox}>
                    <div className={styles.CreateBox}>
                        <div className={styles.CreateBoxInput}>
                            <label htmlFor='createRoomId'>Create Room</label>
                            <button className={styles.CreateBtn} onClick={handleCreateRoom}>CREATE</button>
                        </div>
                    </div>

                    <div className={styles.JoinBox}>
                        <label htmlFor='roomId'>Room Number</label>
                        <input id='roomId' name='roomId' value={roomId} onChange={handleInputChange} />

                        <label htmlFor='name'>Name</label>
                        <input id='name' name='nickname' value={nickname} onChange={handleInputChange} />

                        <button className={styles.JoinBtn} onClick={handleJoinRoom}>JOIN</button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Welcome;