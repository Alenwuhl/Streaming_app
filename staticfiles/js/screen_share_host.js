// Function to start the screen share
async function startScreenShare() {
  try {
    if (window.WebRTC.isScreenSharing) {
      console.warn("[INFO] Screen sharing is already active.");
      return;
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });

    const screenTrack = screenStream.getVideoTracks()[0];
    //window.WebRTC.screenSender = peerConnection.addTrack(screenTrack);
    const screenSender = window.WebRTC.peerConnection.addTrack(screenTrack);
    const sharedScreen = document.getElementById("sharedScreen");

    sharedScreen.srcObject = screenStream;
    sharedScreen.classList.remove("d-none");
    sharedScreen.classList.remove("video-small");
    sharedScreen.classList.add("video-large");
    document.getElementById("localVideo").classList.add("video-small");
    document.getElementById("localVideo").classList.remove("video-large");

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

// Function to stop the screen share
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

// Function to handle the screen sharing
async function initializeScreenSharing() {
  // const sharedScreen = document.getElementById("sharedScreen");
  // console.log("sharedScreen: ", sharedScreen);

  if (window.WebRTC.isScreenSharing) {
    stopScreenShare();
  } else {
    await startScreenShare();
  }
}

export { initializeScreenSharing, startScreenShare, stopScreenShare };
