function getStreamIdFromURL() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const maybeId = pathParts[pathParts.length - 1];
  return /^\d+$/.test(maybeId) ? maybeId : null;
}

function waitForSocketConnection(socket, callback) {
  const retryInterval = 100;

  const checkConnection = () => {
    if (socket.readyState === WebSocket.OPEN) {
      console.log("[INFO] WebSocket is open. Proceeding...");
      callback();
    } else {
      console.warn("[WAITING] WebSocket not open yet. Retrying...");
      setTimeout(checkConnection, retryInterval);
    }
  };

  checkConnection();
}

function sendSurvey() {
  const question = document.getElementById("surveyQuestion").value.trim();
  const options = Array.from(
    document.querySelectorAll("#surveyOptionsContainer input")
  )
    .map((input) => input.value.trim())
    .filter((text) => text);

  if (!question || options.length < 2) {
    alert("Please provide a question and at least two options.");
    return;
  }

  if (window.surveySocket.readyState === WebSocket.OPEN) {
    console.log("[INFO] Sending new survey:", { question, options });

    window.surveySocket.send(
      JSON.stringify({
        type: "start_survey",
        question,
        options: options.map((text) => ({ text })),
      })
    );

    $("#surveyModal").modal("hide");
    document.getElementById("surveyForm").reset();
    document.getElementById("surveyOptionsContainer").innerHTML = "";
  } else if (window.surveySocket.readyState === WebSocket.CONNECTING) {
    console.log("[INFO] Waiting for WebSocket to open...");
    waitForSocketConnection(window.surveySocket, () => sendSurvey());
  } else {
    console.error("[ERROR] WebSocket is closed. Cannot send survey.");
    alert("Cannot create survey: WebSocket connection is not open.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[DEBUG] DOMContentLoaded");

  const streamId = getStreamIdFromURL();
  const isHost = true; // Solo el host puede crear encuestas
  console.log("[DEBUG] streamId:", streamId);
  console.log("[DEBUG] isHost:", isHost);

  if (!streamId || !isHost) {
    console.warn("[WARN] Missing stream ID or not host. Survey setup skipped.");
    return;
  }

  // Crear conexión WebSocket
  let surveySocket = new WebSocket(
    `ws://${window.location.host}/ws/surveys/${streamId}/`
  );
  window.surveySocket = surveySocket;

  // Elementos del DOM
  const surveyContainer = document.getElementById("active-survey");
  const surveyQuestion = document.getElementById("survey-question");
  const surveyOptions = document.getElementById("survey-options");
  const createSurveyBtn = document.getElementById("createSurveyButton");
  const surveyForm = document.getElementById("surveyForm");
  const surveyModal = document.getElementById("surveyModal");
  const addOptionBtn = document.getElementById("addOptionButton");
  const optionsContainer = document.getElementById("surveyOptionsContainer");

  console.log("[DEBUG] surveyForm:", surveyForm);
  console.log("[DEBUG] createSurveyBtn:", createSurveyBtn);

  // Agregar opciones dinámicas
  addOptionBtn?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control mt-2";
    input.name = "options";
    input.placeholder = "Enter an option...";
    optionsContainer.appendChild(input);
  });

  // WebSocket handlers
  surveySocket.onopen = () => {
    console.log("[INFO] WebSocket is open.");
  };

  surveySocket.onerror = (e) => {
    console.error("[ERROR] Survey WebSocket encountered an error:", e);
  };

  surveySocket.onclose = () => {
    console.warn("[WARN] WebSocket closed.");
  };

  surveySocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "survey_start") {
      console.log("[INFO] Received survey start message:", data);
      surveyContainer.classList.remove("d-none");
      surveyQuestion.textContent = data.question;
      surveyOptions.innerHTML = "";

      data.options.forEach((option) => {
        const optionElement = document.createElement("div");
        optionElement.className = "survey-option my-2";
        optionElement.innerHTML = `
          <span class="option-text">${option.text}</span>
          <span class="option-votes badge badge-secondary ml-2" data-option-id="${option.id}">0 votes</span>
        `;
        surveyOptions.appendChild(optionElement);
      });
    }

    if (data.type === "survey_update") {
      console.log("[INFO] Received survey update message:", data);
      data.results.forEach((result) => {
        const badge = document.querySelector(
          `.option-votes[data-option-id="${result.option_id}"]`
        );
        if (badge) {
          badge.textContent = `${result.votes} votes`;
        }
      });
    }
  };

  // Modal: reconectar si el WebSocket está cerrado
  $("#surveyModal").on("shown.bs.modal", function () {
    if (window.surveySocket.readyState === WebSocket.CLOSED) {
      console.warn("[WARN] WebSocket is closed. Trying to reconnect...");

      const newSocket = new WebSocket(
        `ws://${window.location.host}/ws/surveys/${streamId}/`
      );
      window.surveySocket = newSocket;

      newSocket.onopen = () => {
        console.log("[INFO] WebSocket reconnected.");
        createSurveyBtn.disabled = false;
      };

      newSocket.onerror = (e) => {
        console.error("[ERROR] Failed to reconnect WebSocket:", e);
        createSurveyBtn.disabled = true;
      };
    } else if (window.surveySocket.readyState === WebSocket.CONNECTING) {
      console.log("[INFO] WebSocket connecting...");
      createSurveyBtn.disabled = true;
      waitForSocketConnection(window.surveySocket, () => {
        createSurveyBtn.disabled = false;
      });
    } else {
      createSurveyBtn.disabled = false;
    }
  });

  // Botón crear encuesta
  createSurveyBtn.addEventListener("click", (event) => {
    event.preventDefault();
    sendSurvey();
  });
});
