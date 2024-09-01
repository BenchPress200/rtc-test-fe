class Participant {
    constructor(me, name, sendMessage) {
      this.name = name;
      this.sendMessage = sendMessage;
      this.container = document.createElement('div');
      this.container.className = 'participant';
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';
      this.container.style.width = '300px';
      this.container.style.height = '350px';
      this.container.style.border = '1px solid #000000';
      this.container.style.borderRadius = '15px';
      this.container.style.alignItems = 'center';
      this.container.style.justifyContent = 'center';
      this.container.id = name;
  
      this.video = document.createElement('video');
      this.span = document.createElement('span');
      this.rtcPeer = null;
  
      this.span.appendChild(document.createTextNode(name));
      this.span.className = 'videoNickname'
  
      this.container.appendChild(this.video);
      this.container.appendChild(this.span);
      this.container.onclick = this.switchContainerClass.bind(this);

      if (me !== name) {
          document.getElementById('participants').appendChild(this.container);
      }
  
      this.video.id = 'video-' + name;
      this.video.className = 'video'
      this.video.autoplay = true;
      this.video.controls = false;
    }
  
    
    getElement() {
      return this.container;
    }
  
    
    getVideoElement() {
      return this.video;
    }
  
    
    switchContainerClass() {
      if (this.container.className === 'participant') {
        const elements = Array.from(document.getElementsByClassName('participant main'));
        elements.forEach((item) => {
          item.className = 'participant';
        });
        this.container.className = 'participant main';
      } else {
        this.container.className = 'participant';
      }
    }
  
    
    isPresentMainParticipant() {
      return document.getElementsByClassName('participant main').length !== 0;
    }
  
  
    offerToReceiveVideo(error, offerSdp) {
      if (error) return console.error('sdp offer error');
      console.log('Invoking SDP offer callback function');
  
      const msg = {
        id: 'receiveVideoFrom',
        sender: this.name,
        sdpOffer: offerSdp,
      };
  
      this.sendMessage(msg);
    }
  
    
    onIceCandidate(candidate) {
      console.log('Local candidate' + JSON.stringify(candidate));
  
      const message = {
        id: 'onIceCandidate',
        candidate: candidate,
        name: this.name,
      };
  
      this.sendMessage(message);
    }
  
    
    dispose() {
      console.log('Disposing participant ' + this.name);
      if (this.rtcPeer) {
        this.rtcPeer.dispose();
      }
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  
  }
  
  export default Participant;
  