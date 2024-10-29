// Selecciona el elemento de video
const videoElement = document.getElementById('remoteVideo') || document.getElementById('localVideo');
const muteButton = document.getElementById('muteButton');
const fullscreenButton = document.getElementById('fullscreenButton');

// Mute/Unmute con cambio de icono (solo para el host)
if (muteButton) {
    muteButton.addEventListener('click', () => {
        if (videoElement.muted) {
            videoElement.muted = false;
            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';  // Cambia a volumen activo
        } else {
            videoElement.muted = true;
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';  // Cambia a mute
        }
    });
}

// Fullscreen
if (fullscreenButton) {
    fullscreenButton.addEventListener('click', () => {
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.mozRequestFullScreen) { // Firefox
            videoElement.mozRequestFullScreen();
        } else if (videoElement.webkitRequestFullscreen) { // Chrome, Safari, Opera
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) { // IE/Edge
            videoElement.msRequestFullscreen();
        }
    });
}

// Comprobar si el navegador soporta el modo fullscreen
if (!document.fullscreenEnabled && 
    !document.mozFullScreenEnabled && 
    !document.webkitFullscreenEnabled && 
    !document.msFullscreenEnabled) {
    if (fullscreenButton) {
        fullscreenButton.style.display = 'none';  // Ocultar botón si no soporta fullscreen
    }
}

