import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import kurentoUtils from 'kurento-utils';
import { domain } from '../constants/constant';


function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);
  const [participants, setParticipants] = useState([]);
  const ws = useRef(null);


  useEffect(() => {
    let localStream;
    let kurentoPeer;

    // WebSocket 연결 설정
    ws.current = new WebSocket(`ws://${domain}:8080/ws`);
    ws.current.onopen = () => {
      console.log("WebSocket connection established");
      ws.current.send(JSON.stringify({ event: 'joinRoom', roomId }));
    };

    ws.current.onmessage = (message) => {
      const parsedMessage = JSON.parse(message.data);

      switch (parsedMessage.event) {
        case 'newParticipant':
          if (!remoteVideoRefs.current[parsedMessage.participantId]) {
            remoteVideoRefs.current[parsedMessage.participantId] = React.createRef();
          }
          setParticipants((prev) => [...prev, parsedMessage.participantId]);
          break;

        case 'answer':
          kurentoPeer.processAnswer(parsedMessage.sdpAnswer);
          break;

        case 'iceCandidate':
          kurentoPeer.addIceCandidate(parsedMessage.candidate);
          break;

        default:
          break;
      }
    };

    // 로컬 미디어 스트림 설정
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        localStream = stream;

        const options = {
          localVideo: localVideoRef.current,
          onicecandidate: (candidate) => {
            ws.current.send(JSON.stringify({ event: 'iceCandidate', candidate }));
          },
        };

        kurentoPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
          if (error) return console.error(error);
          this.generateOffer((err, offerSdp) => {
            if (err) return console.error(err);
            ws.current.send(JSON.stringify({ event: 'offer', sdpOffer: offerSdp, roomId }));
          });
        });
      });

    return () => {
      // WebSocket 연결 종료 및 미디어 스트림 정리
      if (ws.current) ws.current.close();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (kurentoPeer) kurentoPeer.dispose();
      navigate('/');
    };
  }, [roomId]);

  const handleLeaveRoom = () => {
    if (ws.current) ws.current.send(JSON.stringify({ event: 'leaveRoom', roomId }));
    navigate('/');
  };


  return (
    <div>
      <h1>Room {roomId}</h1>
      <button onClick={handleLeaveRoom}>Leave Room</button>
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted></video>
        {participants.map((participant, index) => (
          <video key={index} ref={remoteVideoRefs.current[participant]} autoPlay></video>
        ))}
      </div>
    </div>
  );
}

export default Room;