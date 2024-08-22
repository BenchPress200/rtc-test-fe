import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import styles from '../styles/Room.module.css';

const serverUrl = "ws://localhost:8080/ws";  // WebSocket 서버 주소

function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname;

  const [peers, setPeers] = useState([]);
  const [usersInRoom, setUsersInRoom] = useState(0);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const localStream = useRef(null);
  const webSocketRef = useRef(null);
  const negotiationStatus = useRef({});  // 협상 완료 여부 상태 관리

  const [isCamOn, setCamOn] = useState(true);
  const [isMicOn, setMicOn] = useState(true);

  useEffect(() => {
    // 웹 소켓 서버와 연결
    webSocketRef.current = new WebSocket(serverUrl);

    // 웹 소켓 연결 성공 이벤트 리스너
    webSocketRef.current.onopen = () => {
      startMedia();
    };

    // 웹 소켓 서버로부터 메시지 수신 처리
    webSocketRef.current.onmessage = async (message) => {
      const parsedMessage = JSON.parse(message.data);

      switch (parsedMessage.id) {
        case 'existingUsers':
          handleExistingUsers(parsedMessage.existingUsers);
          break;
        case 'newParticipant':
          handleNewParticipant(parsedMessage.nickname);
          break;
        case 'iceCandidate':
          handleIceCandidate(parsedMessage.candidate, parsedMessage.sender);
          break;
        case 'sdpAnswer':
          handleAnswer(parsedMessage.sdpAnswer, parsedMessage.sender);
          break;
        case 'receiveVideoFrom':
          receiveVideoFrom(parsedMessage.sender, parsedMessage.sdpOffer);
          break;
        default:
          break;
      }
    };

    // 언마운트시 리소스 정리
    return () => {
      webSocketRef.current.close();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, []);

  const startMedia = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => { 
        localStream.current = stream;
        localVideoRef.current.srcObject = stream;

        // 서버에 참가자 등록
        webSocketRef.current.send(JSON.stringify({
          id: 'joinRoom',
          roomId,
          nickname
        }));
      });
  };

  const handleExistingUsers = async (users) => {
    setUsersInRoom(users.length);
    for (const user of users) {
      await createPeerConnection(user);
    }
  };

  const handleNewParticipant = async (newUser) => {
    setUsersInRoom(prevCount => prevCount + 1);
    await createPeerConnection(newUser);
  };

  const createPeerConnection = async (nickname) => {
    // 중복된 피어 연결 방지
    if (peerConnections.current[nickname]) {
      return peerConnections.current[nickname];
    }

    const peerConnection = new RTCPeerConnection();
    peerConnections.current[nickname] = peerConnection;
    negotiationStatus.current[nickname] = false;  // 협상 초기 상태

    // 로컬 스트림의 모든 트랙을 추가
    localStream.current.getTracks().forEach(track => peerConnection.addTrack(track, localStream.current));

    // ICE 후보자 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        webSocketRef.current.send(JSON.stringify({
          id: 'onIceCandidate',
          candidate: event.candidate,
          sender: nickname
        }));
      }
    };

    // 원격 트랙 수신 시 처리
    peerConnection.ontrack = (event) => {
      setPeers(prevPeers => {
        const isAlreadyAdded = prevPeers.some(peer => peer.nickname === nickname);
        if (!isAlreadyAdded) {
          return [...prevPeers, { nickname, stream: event.streams[0] }];
        }
        return prevPeers;
      });
    };

    // 새로운 연결 생성 후 SDP Offer 전송
    try {
      if (!negotiationStatus.current[nickname]) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        webSocketRef.current.send(JSON.stringify({
          id: 'receiveVideoFrom',
          sender: nickname,
          sdpOffer: offer.sdp
        }));
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }

    return peerConnection;
  };

  const handleAnswer = (sdpAnswer, senderNickname) => {
    const peerConnection = peerConnections.current[senderNickname];
    if (peerConnection) {
      peerConnection.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: sdpAnswer
      })).catch((error) => console.error('Error setting remote description:', error));
      negotiationStatus.current[senderNickname] = true;  // 협상 완료 상태 업데이트
    }
  };

  const handleIceCandidate = (candidate, senderNickname) => {
    const peerConnection = peerConnections.current[senderNickname];
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .catch((error) => console.error('Error adding ICE candidate:', error));
    }
  };

  const receiveVideoFrom = async (senderNickname, sdpOffer) => {
    let peerConnection = peerConnections.current[senderNickname];

    if (!peerConnection) {
      peerConnection = await createPeerConnection(senderNickname);
    }

    try {
      const desc = new RTCSessionDescription({
        type: 'offer',
        sdp: sdpOffer
      });

      await peerConnection.setRemoteDescription(desc);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      webSocketRef.current.send(JSON.stringify({
        id: 'sdpAnswer',
        sdpAnswer: answer.sdp,
        sender: senderNickname
      }));

      negotiationStatus.current[senderNickname] = true;  // 협상 완료 상태 업데이트
    } catch (error) {
      console.error('Error processing offer:', error);
    }
  };

  const toggleCam = () => {
    localStream.current.getVideoTracks().forEach(track => (track.enabled = !isCamOn));
    setCamOn(!isCamOn);
  };

  const toggleMic = () => {
    localStream.current.getAudioTracks().forEach(track => (track.enabled = !isMicOn));
    setMicOn(!isMicOn);
  };

  const leaveRoom = () => {
    navigate('/login/oauth2/code/kakao');
  };

  return (
    <div className={styles.roomBody}>
      <header className={styles.roomHeader}>
        <div className={styles.roomNumber}>{roomId} 번 방</div>
        <div className={styles.usersNum}>현재 인원: {usersInRoom}/5</div>
      </header>
      <div className={styles.videoContainer}>

        <div className={styles.myVideoBox}>
          <video className={styles.video} ref={localVideoRef} autoPlay playsInline muted />
          <div className={styles.nickname}>{nickname}</div>
        </div>

        {peers.map((peer, index) => (
          // 자신의 닉네임과 피어의 닉네임이 같으면 렌더링하지 않음
          peer.nickname !== nickname && (
            <div key={index} className={styles.myVideoBox}>
              <video className={styles.video}
                ref={video => {
                  if (video) video.srcObject = peer.stream;
                }}
                autoPlay
                playsInline
              />
              <div className={styles.nickname}>{peer.nickname}</div>
            </div>
          )
        ))}
      </div>
      <div className={styles.btnBox}>
        <button onClick={toggleCam}>{isCamOn ? '카메라 끄기' : '카메라 켜기'}</button>
        <button onClick={toggleMic}>{isMicOn ? '마이크 끄기' : '마이크 켜기'}</button>
        <button onClick={leaveRoom}>나가기</button>
      </div>
    </div>
  );
}

export default Room;
