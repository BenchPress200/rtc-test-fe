import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import kurentoUtils from 'kurento-utils';
import Participant from './Participant';
import styles from '../styles/Room.module.css';

/**
 * participant로 생성한 태그 값을 state로 관리하려고 시도하면 
 * 파악하지 못한 에러가 터짐
 * 
 * -> DOM에 직접 접근할 수 밖에 없음
 * 
 */

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
	const numberOfUsersRef = useRef(0);
	
	

	useEffect(() => {
		wsRef.current = new WebSocket('ws://localhost:8080/signal');

		wsRef.current.onopen = () => {
			console.log("WebSocket connection established");
			register();
		};

		wsRef.current.onerror = (error) => {
			console.error("WebSocket error: ", error);
		  };

		// 핑퐁 START ----------------------------------------------------------
		const interval = setInterval(() => {
			const message = {
				id: "pingPong",
				message: "ping"
			}
			sendMessage(message);
		  }, 10000);
		// 핑퐁 START ----------------------------------------------------------
	  
		  
		  

		return () => {
			if (wsRef.current) {
				alert("소켓닫기")
			  wsRef.current.close();
			}

			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(track => track.stop());
			}
	
			
			for (let key in participants) {
				if (participants[key].rtcPeer) {
					participants[key].rtcPeer.dispose();
					participants[key].rtcPeer = null;
				}
			}
			
			// 핑퐁 START ----------------------------------------------------------
			clearInterval(interval);
			console.log('인터벌 정리됨');
			// 핑퐁 END ----------------------------------------------------------
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

				case 'isCamOn':
					controlCam(parsedMessage);
					break;
					
				case 'isMicOn':
					controlMic(parsedMessage);
					break;
							
				// 핑퐁 START ---------------------------------------------------------
				case 'pingPong':
					console.log(parsedMessage);
					break;
				// 핑퐁 END ---------------------------------------------------------

				default:
					console.error('Unrecognized message', parsedMessage);
				}
			}
		}
	}, [wsRef.current])

	const controlCam = (parsedMessage) => {
		if (parsedMessage.isCamOn) {
			document.getElementById(`video-${parsedMessage.sender}`).style.visibility = 'visible'
		} else {
			document.getElementById(`video-${parsedMessage.sender}`).style.visibility = 'hidden'
		}
	}

	const controlMic = (parsedMessage) => {
		console.log('here: ', parsedMessage)
		if (parsedMessage.isMicOn) {
			document.getElementById(`video-${parsedMessage.sender}`).muted = false;
		} else {
			document.getElementById(`video-${parsedMessage.sender}`).muted = true;
		}
	}




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
		
		for (var key in participants) {
			if (participants[key].rtcPeer) {
				participants[key].rtcPeer.dispose();
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


		document.getElementById("numUsers").innerText = `${Object.keys(participants).length} 명`
		numberOfUsersRef.current = Object.keys(participants).length;

		
		var video = participant.getVideoElement();

		var options = {
			localVideo: video,
			mediaConstraints: constraints,
			onicecandidate: participant.onIceCandidate.bind(participant),
			configuration: {
				iceServers: [
					{
						urls: 'turn:13.209.11.178:3478',
						username: 'blueberry',
						credential: '1234'
					}
				]
			}
		}

		participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
			function (error) {
			if(error) {
				return console.error(error);
			}
			this.generateOffer (participant.offerToReceiveVideo.bind(participant));
		});

		
		participant.rtcPeer.getLocalStream((stream) => {
			localStreamRef.current = stream;
			if (!stream) {
				console.error('Failed to get local stream');
			}
		});

		

		msg.data.forEach(receiveVideo);
	}

	const leaveRoom = () => {
		console.log('click')
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


		document.getElementById("numUsers").innerText = `${Object.keys(participants).length} 명`
		numberOfUsersRef.current = Object.keys(participants).length;

		var video = participant.getVideoElement();

		var options = {
			remoteVideo: video,
			onicecandidate: participant.onIceCandidate.bind(participant),
			configuration: {
				iceServers: [
					{
						urls: 'turn:13.209.11.178:3478',
						username: 'blueberry',
						credential: '1234'
					}
				]
			}
		}

		participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
			function (error) {
				if(error) {
					return console.error(error);
				}
				this.generateOffer(participant.offerToReceiveVideo.bind(participant));
		});		
	}

	const onParticipantLeft = (request) => {
		console.log('Participant ' + request.name + ' left');
		var participant = participants[request.name];

		if (participant !== undefined) {
			participant.dispose();
			delete participants[request.name];
		}
	
		document.getElementById("numUsers").innerText = `${Object.keys(participants).length} 명`
		numberOfUsersRef.current = Object.keys(participants).length;
	
	}

	const toggleCam = () => {
		localStreamRef.current.getVideoTracks().forEach(track => (track.enabled = !isCamOn));
		setCamOn(!isCamOn);
	};

	useEffect(() => {
		console.log(numberOfUsersRef.current)
		if(numberOfUsersRef.current > 0) {
			console.log('캠조작 !')
			const message = {
				id: 'isCamOn',
				sender: nickname,
				isCamOn: isCamOn
			}
	
			sendMessage(message);
		}
	}, [isCamOn]);

	
	const toggleMic = () => {
		localStreamRef.current.getAudioTracks().forEach(track => (track.enabled = !isMicOn));
		setMicOn(!isMicOn);
	};

	useEffect(() => {
		if(numberOfUsersRef.current > 0) {
			const message = {
				id: 'isMicOn',
				sender: nickname,
				isMicOn: isMicOn
			}
	
			sendMessage(message);
		}
	}, [isMicOn]);



  return (
    <div id="container" className={styles.roomBody}>
		<div id="room-header" className={styles.roomHeaderBox}>
			<div className={styles.roomNumber}>{roomId}번 방</div>
			<div id="numUsers" className={styles.numUsers}>0 명</div>
		</div>
			<div id="participants" className={styles.videoContainer}>
				<div className={styles.participant} id={nickname}>
					<video id="video-나" className={styles.video} ref={localVideoRef} autoPlay playsInline></video>
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
