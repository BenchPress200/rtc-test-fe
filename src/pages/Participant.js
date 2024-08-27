class Participant {
    constructor(name, sendMessage) {
      this.name = name;
      this.sendMessage = sendMessage
      this.container = document.createElement('div');
      this.container.className = this.isPresentMainParticipant() ? 'participant' : 'participant main';
      this.container.id = name;
  
      this.video = document.createElement('video');
      this.span = document.createElement('span');
      this.rtcPeer = null;
  
      this.span.appendChild(document.createTextNode(name));
  
      this.container.appendChild(this.video);
      this.container.appendChild(this.span);
      this.container.onclick = this.switchContainerClass.bind(this);
      document.getElementById('participants').appendChild(this.container);
  
      this.video.id = 'video-' + name;
      this.video.autoplay = true;
      this.video.controls = false;
    }
  
    // Returns the container element
    getElement() {
      return this.container;
    }
  
    // Returns the video element
    getVideoElement() {
      return this.video;
    }
  
    // Switch container class between participant and main participant
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
  
    // Check if there's a main participant already present
    isPresentMainParticipant() {
      return document.getElementsByClassName('participant main').length !== 0;
    }
  
    // Offer to receive video stream from a peer
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
  
    // Handle ICE candidate events
    onIceCandidate(candidate) {
      console.log('Local candidate' + JSON.stringify(candidate));
  
      const message = {
        id: 'onIceCandidate',
        candidate: candidate,
        name: this.name,
      };
  
      this.sendMessage(message);
    }
  
    // Dispose the participant and clean up
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
  