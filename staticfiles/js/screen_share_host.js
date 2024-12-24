// screen_share.js

async function startScreenShare(peerConnection, sharedScreen) {
    try {
      if (window.WebRTC.isScreenSharing) {
        console.warn("[INFO] Screen sharing is already active.");
        return;
      }
  
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
  
      const screenTrack = screenStream.getVideoTracks()[0];
      window.WebRTC.screenSender = peerConnection.addTrack(screenTrack);
      console.log("[DEBUG] Screen sharing track added to peer connection:", screenTrack);
      
  
      sharedScreen.srcObject = screenStream;
      sharedScreen.classList.remove("d-none");
      sharedScreen.classList.remove("video-small");
      sharedScreen.classList.add("video-large");
      document.getElementById("localVideo").classList.add("video-small");
      document.getElementById("localVideo").classList.add("video-large");
  
      screenTrack.onended = () => {
        stopScreenShare(peerConnection, sharedScreen, localVideo);
        console.log("[INFO] Screen sharing stopped.");
      };
      
      window.WebRTC.isScreenSharing = true;
      console.log("[INFO] Screen sharing started successfully.");
    } catch (error) {
      console.error("[ERROR] Failed to start screen sharing:", error);
    }
  }
  
  function stopScreenShare(peerConnection, sharedScreen) {
    try {
      if (!window.WebRTC.isScreenSharing) {
        console.warn("[INFO] No active screen sharing to stop.");
        return;
      }
  
      if (window.WebRTC.screenSender) {
        peerConnection.removeTrack(window.WebRTC.screenSender);
        window.WebRTC.screenSender = null;
      }
  
      if (sharedScreen.srcObject) {
        sharedScreen.srcObject.getTracks().forEach((track) => track.stop());
        sharedScreen.srcObject = null;
      }

      sharedScreen.classList.add("d-none");
      sharedScreen.classList.remove("video-large");
      document.getElementById("localVideo").classList.remove("video-small");
      document.getElementById("localVideo").classList.add("video-large");
  
      window.WebRTC.isScreenSharing = false;
      console.log("[INFO] Screen sharing stopped.");
    } catch (error) {
      console.error("[ERROR] Failed to stop screen sharing:", error);
    }
  }
  
  function initializeScreenSharing(peerConnection, screenShareButton, sharedScreen) {
    screenShareButton.addEventListener("click", async () => {
      if (window.WebRTC.isScreenSharing) {
        stopScreenShare(peerConnection, sharedScreen);
      } else {
        await startScreenShare(peerConnection, sharedScreen);
      }
    });
  }
  
  export { initializeScreenSharing, startScreenShare, stopScreenShare };
  