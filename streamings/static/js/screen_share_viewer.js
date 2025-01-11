let sharedScreenStream = null;
let sharedScreenTrack = null;
let isScreenSharingActive = false;

document.addEventListener("DOMContentLoaded", () => {
  const sharedScreen = document.getElementById("sharedScreen");
  const hostVideo = document.getElementById("hostVideo");

  // Toggle between shared screen and host video
  sharedScreen.addEventListener("click", () =>
    toggleScreenView(hostVideo, sharedScreen)
  );
});

// Function to handle the new track
function handleScreenShareTrack(track) {
  if (track.kind === "video") {
    console.log("[INFO] Screen sharing track received.");
    sharedScreenStream = new MediaStream([track]);
    const sharedScreen = document.getElementById("sharedScreen");

    if (sharedScreen) {
      sharedScreen.srcObject = sharedScreenStream;
      sharedScreen.classList.remove("d-none");
      sharedScreen.classList.add("video-large");

      // Asegurar que el video de la cámara se muestre pequeño
      const remoteVideo = document.getElementById("hostVideo");
      remoteVideo.classList.remove("video-large");
      remoteVideo.classList.add("video-small");

      console.log("[INFO] Screen sharing started:", sharedScreenStream);
    } else {
      console.error("[ERROR] Shared screen element not found.");
    }

    track.onended = () => stopScreenShareViewer();
  }
}

// Function to stop the screen share viewer
function stopScreenShareViewer() {
  console.log("[INFO] Screen sharing stopped.");
  const sharedScreen = document.getElementById("sharedScreen");
  sharedScreen.srcObject = null;
  sharedScreen.classList.add("d-none");

  sharedScreenTrack = null;
  sharedScreenStream = null;
  isScreenSharingActive = false;
}

// Function to toggle between shared screen and host video in the DOM
function toggleScreenView(hostVideo, sharedScreen) {
  if (sharedScreen.classList.contains("video-large")) {
    sharedScreen.classList.remove("video-large");
    sharedScreen.classList.add("video-small");

    hostVideo.classList.remove("video-small");
    hostVideo.classList.add("video-large");
  } else {
    sharedScreen.classList.remove("video-small");
    sharedScreen.classList.add("video-large");

    hostVideo.classList.remove("video-large");
    hostVideo.classList.add("video-small");
  }

  console.log(
    "[INFO] Toggled screen view between host video and shared screen."
  );
}

export { handleScreenShareTrack, stopScreenShareViewer, toggleScreenView };
