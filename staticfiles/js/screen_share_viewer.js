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

function handleScreenShareTrack(track) {
  if (track.kind === "video") {
    console.log("[INFO] Screen sharing track received.");
    sharedScreenTrack = track;
    sharedScreenStream = new MediaStream([track]);

    const sharedScreen = document.getElementById("sharedScreen");
    const hostVideo = document.getElementById("hostVideo");

    if (!sharedScreen || !hostVideo) {
      console.error(
        "[ERROR] Required elements for screen sharing are missing."
      );
      return;
    }

    // Configurar pantalla compartida
    sharedScreen.srcObject = sharedScreenStream;
    sharedScreen.classList.remove("d-none");
    sharedScreen.classList.add("video-large");

    // Minimizar video del host
    hostVideo.classList.remove("video-large");
    hostVideo.classList.add("video-small");

    console.log("[INFO] Screen sharing started: ", sharedScreenStream);
    isScreenSharingActive = true;

    // Manejar el evento de finalización
    track.onended = () => stopScreenShareViewer();
  }
}

function stopScreenShareViewer() {
  console.log("[INFO] Screen sharing stopped.");
  const sharedScreen = document.getElementById("sharedScreen");
  const hostVideo = document.getElementById("hostVideo");

  if (!sharedScreen || !hostVideo) {
    console.error(
      "[ERROR] Required elements for stopping screen sharing are missing."
    );
    return;
  }

  // Detener y ocultar la pantalla compartida
  sharedScreen.srcObject = null;
  sharedScreen.classList.add("d-none");
  sharedScreen.classList.remove("video-large");
  sharedScreen.classList.remove("video-small");

  // Restaurar el video del host
  hostVideo.classList.remove("video-small");
  hostVideo.classList.add("video-large");

  sharedScreenTrack = null;
  sharedScreenStream = null;
  isScreenSharingActive = false;

  console.log("[INFO] Screen sharing stopped and host video restored.");
}

export { handleScreenShareTrack, stopScreenShareViewer };
