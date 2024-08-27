import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import kurentoUtils from 'kurento-utils';
import Participant from './Participant';
import styles from '../styles/Room.module.css';



const Room = () => {
	
	const { roomId } = useParams();
	const location = useLocation();
	const nickname = location.state?.nickname;
	const navigate = useNavigate();
	
	const [isCamOn, setCamOn] = useState(true);
	const [isMicOn, setMicOn] = useState(true);
	
	const localStreamRef = useRef(null);
	const localVideoRef = useRef(null);
	const wsRef = useRef(null);
	const participants = {};

	useEffect(() => {
		wsRef.current = new WebSocket('ws://localhost:8080/signal');

		wsRef.current.onopen = () => {
			console.log("WebSocket connection established");
			register();  // WebSocket이 OPEN 상태가 된 후 register 호출
		};

		wsRef.current.onerror = (error) => {
			console.error("WebSocket error: ", error);
		  };

		return () => {
			if (wsRef.current) {
			  wsRef.current.close();
			}
		};
	  
	}, []);
	
	useEffect(() => {
		if(wsRef.current) {

			wsRef.current.onmessage = function(message) {
				var parsedMessage = JSON.parse(message.data);
				console.info('Received message: ' + message.data);
		
				switch (parsedMessage.id) {
				case 'existingParticipants':
					onExistingParticipants(parsedMessage);
					break;
				case 'newParticipantArrived':
					onNewParticipant(parsedMessage);
					break;
				case 'participantLeft':
					onParticipantLeft(parsedMessage);
					break;
				case 'receiveVideoAnswer':
					receiveVideoResponse(parsedMessage);
					break;
				case 'iceCandidate':
					participants[parsedMessage.name].rtcPeer.addIceCandidate(parsedMessage.candidate, function (error) {
						if (error) {
						console.error("Error adding candidate: " + error);
						return;
						}
					});
					break;
				default:
					console.error('Unrecognized message', parsedMessage);
				}
			}
		}
	}, [wsRef.current])

	const sendMessage = (message) => {
		const jsonMessage = JSON.stringify(message);
		console.log('Sending message: ' + jsonMessage);
		wsRef.current.send(jsonMessage);
	}

	const register = () => {
		navigator.mediaDevices.getUserMedia({ video: true, audio: true })
		.then(stream => { 
		  localStreamRef.current = stream;
		  localVideoRef.current.srcObject = stream;
		});
		

		var message = {
			id : 'joinRoom',
			name : nickname,
			room : roomId,
		}
		sendMessage(message);
	}


	const onNewParticipant = (request) => {
		receiveVideo(request.name);
	}

	const receiveVideoResponse = (result) => {
		participants[result.name].rtcPeer.processAnswer (result.sdpAnswer, function (error) {
			if (error) {
				return console.error (error);
			}
		});
	}

	const stop = () => {
		console.log("Stopping WebRTC communication");
		
		// 모든 참여자의 rtcPeer 객체를 정리
		for (var key in participants) {
			if (participants[key].rtcPeer) {
				participants[key].rtcPeer.dispose(); // WebRTC 연결 해제
				participants[key].rtcPeer = null;
			}
		}

		wsRef.current.close();
	}

	const onExistingParticipants = (msg) => {
		var constraints = {
			audio : true,
			video : {
				mandatory : {
					maxWidth : 300,
					maxFrameRate : 120,
					minFrameRate : 15
				}
			}
		};
		console.log(nickname + " registered in room ");
		var participant = new Participant(nickname, nickname, sendMessage);
		participants[nickname] = participant;
		
		var video = participant.getVideoElement();

		var options = {
			localVideo: video,
			mediaConstraints: constraints,
			onicecandidate: participant.onIceCandidate.bind(participant)
		}

		participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
			function (error) {
			if(error) {
				return console.error(error);
			}
			this.generateOffer (participant.offerToReceiveVideo.bind(participant));
		});

		
		participant.rtcPeer.getLocalStream((stream) => {
			console.log('로컬할당')
			localStreamRef.current = stream;
			if (!stream) {
				console.error('Failed to get local stream');
			}
		});

		

		msg.data.forEach(receiveVideo);
	}

	const leaveRoom = () => {
		sendMessage({
			id : 'leaveRoom'
		});

		for ( var key in participants) {
			participants[key].dispose();
		}

		navigate('/');

		wsRef.current.close();
	}

	const receiveVideo = (sender) => {
		var participant = new Participant(nickname, sender, sendMessage);
		participants[sender] = participant;
		var video = participant.getVideoElement();

		var options = {
		remoteVideo: video,
		onicecandidate: participant.onIceCandidate.bind(participant)
		}

		participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
				function (error) {
				if(error) {
					return console.error(error);
				}
				this.generateOffer (participant.offerToReceiveVideo.bind(participant));
		});
	}

	const onParticipantLeft = (request) => {
		console.log('Participant ' + request.name + ' left');
		var participant = participants[request.name];
		participant.dispose();
		delete participants[request.name];
	}

	const toggleCam = () => {
		localStreamRef.current.getVideoTracks().forEach(track => (track.enabled = !isCamOn));
		setCamOn(!isCamOn);
	};
	

	// 마이크 상태 토글 함수
	const toggleMic = () => {
		localStreamRef.current.getAudioTracks().forEach(track => (track.enabled = !isMicOn));
		setMicOn(!isMicOn);
	};


  return (
    <div id="container" className={styles.roomBody}>
		<h2 id="room-header" className={styles.roomHeader}>방 번호  {roomId}</h2>
				<div id="participants" className={styles.videoContainer}>
					<div className={styles.participant} id={nickname}>
						<video id="video-나" className={styles.video} ref={localVideoRef} autoPlay playsInline muted></video>
						<span className="videoNickname">{nickname}</span>
					</div>
					

				</div>

				<input type="button" id="button-leave" onMouseUp={(e) => leaveRoom()}
					value="Leave room"/>

				<button onClick={toggleCam}>
					{isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
				</button>
				<button onClick={toggleMic}>
					{isMicOn ? 'Turn Off Mic' : 'Turn On Mic'}
				</button>
	</div>
  );
}

export default Room;

// 그냥 페이지 쪼개기