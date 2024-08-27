import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import kurentoUtils from 'kurento-utils';
import Participant from './Participant';



const Home = () => {

var ws = new WebSocket('ws://localhost:8080/signal');
var participants = {};
var name;

ws.onmessage = function(message) {
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

function register() {
	name = document.getElementById('name').value;
	var room = document.getElementById('roomName').value;

	document.getElementById('room-header').innerText = 'ROOM ' + room;
	document.getElementById('join').style.display = 'none';
	document.getElementById('room').style.display = 'block';

	var message = {
		id : 'joinRoom',
		name : name,
		room : room,
	}
	sendMessage(message);
}

function onNewParticipant(request) {
	receiveVideo(request.name);
}

function receiveVideoResponse(result) {
	participants[result.name].rtcPeer.processAnswer (result.sdpAnswer, function (error) {
		if (error) return console.error (error);
	});
}

function stop() {
  console.log("Stopping WebRTC communication");
  
  // 모든 참여자의 rtcPeer 객체를 정리
  for (var key in participants) {
      if (participants[key].rtcPeer) {
          participants[key].rtcPeer.dispose(); // WebRTC 연결 해제
          participants[key].rtcPeer = null;
      }
  }

  // WebSocket 연결을 닫고, 방에서 나감
  ws.close();
  
  // UI 업데이트
  document.getElementById('join').style.display = 'block';
  document.getElementById('room').style.display = 'none';
}

function onExistingParticipants(msg) {
	var constraints = {
		audio : true,
		video : {
			mandatory : {
				maxWidth : 320,
				maxFrameRate : 120,
				minFrameRate : 15
			}
		}
	};
	console.log(name + " registered in room ");
	var participant = new Participant(name, sendMessage);
	participants[name] = participant;
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

	msg.data.forEach(receiveVideo);
}

function leaveRoom() {
	sendMessage({
		id : 'leaveRoom'
	});

	for ( var key in participants) {
		participants[key].dispose();
	}

	document.getElementById('join').style.display = 'block';
	document.getElementById('room').style.display = 'none';

	ws.close();
}

function receiveVideo(sender) {
	var participant = new Participant(sender, sendMessage);
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
	});;
}

function onParticipantLeft(request) {
	console.log('Participant ' + request.name + ' left');
	var participant = participants[request.name];
	participant.dispose();
	delete participants[request.name];
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Sending message: ' + jsonMessage);
	ws.send(jsonMessage);
}


  return (
    <div id="container">
		<div id="wrapper">
			<div id="join" className="animateJoin">
				<h1>Join a Room</h1>
				<form onSubmit={(e) => { e.preventDefault(); register(); }} acceptCharset="UTF-8">
					<p>
						<input type="text" name="name" id="name"
							placeholder="Username" required/>
					</p>
					<p>
						<input type="text" name="room" id="roomName"
							placeholder="Room" required/>
					</p>
					<p className="submit">
						<input type="submit" name="commit" value="Join!"/>
					</p>
				</form>
			</div>
			<div id="room" style={{display: 'none'}}>
				<h2 id="room-header"></h2>
				<div id="participants"></div>
				<input type="button" id="button-leave" onMouseUp={(e) => leaveRoom()}
					value="Leave room"/>
			</div>
		</div>
	</div>
  );
}

export default Home;

// 그냥 페이지 쪼개기