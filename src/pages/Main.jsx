import kurentoUtils from 'kurento-utils';
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../styles/Main.module.css'

const Main = () => {
    const [ws, setWs] = useState(null);
    const [roomName, setRoomName] = useState(''); // 방 이름을 관리
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
  
    useEffect(() => {
      const socket = new WebSocket('ws://localhost:8080/groupcall');
      setWs(socket);
  
      socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.id === 'answer') {
          peerConnection.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdpAnswer }));
        } else if (data.id === 'iceCandidate') {
          peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
  
      return () => socket.close();
    }, []);
  
    const joinRoom = () => {
      if (!roomName) return;
  
      ws.send(JSON.stringify({ id: 'joinRoom', roomName })); // 방에 입장
    };
  
    const startCall = async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = localStream;
  
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:YOUR_TURN_SERVER_IP', username: 'username', credential: 'password' }
        ]
      });
  
      localStream.getTracks().forEach(track => peerConnection.current.addTrack(track, localStream));
  
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(JSON.stringify({ id: 'iceCandidate', roomName, candidate: event.candidate }));
        }
      };
  
      peerConnection.current.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };
  
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
  
      ws.send(JSON.stringify({ id: 'offer', roomName, sdpOffer: offer.sdp }));
    };
  
    return (
      <div>
        <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Enter room name" />
        <button onClick={joinRoom}>Join Room</button>
        <video ref={localVideoRef} autoPlay muted />
        <video ref={remoteVideoRef} autoPlay />
        <button onClick={startCall}>Start Call</button>
      </div>
    );
  };

export default Main;
