function addSurveyOption() {
  console.log("[INFO] Adding a new survey option...");
  const optionsContainer = document.getElementById("surveyOptionsContainer");
  if (!optionsContainer) {
    console.error("[ERROR] Options container not found.");
    return;
  }

  const optionCount = optionsContainer.childElementCount + 1; // Contar opciones existentes
  if (optionCount > 5) {
    console.warn("[WARNING] Maximum of 5 options reached.");
    alert("You can add up to 5 options only.");
    return;
  }

  const newOption = document.createElement("input");
  newOption.type = "text";
  newOption.className = "form-control mb-2";
  newOption.placeholder = `Option ${optionCount}`;
  newOption.required = true;

  optionsContainer.appendChild(newOption);
  console.log(`[INFO] Option ${optionCount} added successfully.`);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[DEBUG] DOMContentLoaded triggered.");

  // Accede al contenedor principal con el atributo `data-is-host`
  const mainContainer = document.querySelector("[data-is-host]");
  if (!mainContainer) {
    console.error("[ERROR] Main container with data-is-host not found.");
    return;
  }

  // Verifica si el usuario es host
  const isHost = mainContainer.getAttribute("data-is-host") === "true";
  console.log(`[DEBUG] Is Host: ${isHost}`);

  if (!isHost) {
    console.log("[INFO] Skipping surveys.js for viewer.");
    return;
  }

  // Variables para el host
  const surveyContainer = document.getElementById("active-survey");
  const surveyQuestion = document.getElementById("survey-question");
  const surveyOptions = document.getElementById("survey-options");
  const endSurveyBtn = document.getElementById("end-survey-btn");
  const startSurveyBtn = document.getElementById("startSurveyButton");
  const createSurveyBtn = document.getElementById("createSurveyButton");
  const surveyForm = document.getElementById("surveyForm");
  const surveyModal = document.getElementById("surveyModal");

  console.log("[DEBUG] Checking presence of survey elements in DOM...");
  const requiredElements = [
    { element: surveyContainer, name: "Survey container" },
    { element: surveyQuestion, name: "Survey question container" },
    { element: surveyOptions, name: "Survey options container" },
    { element: endSurveyBtn, name: "End survey button" },
    { element: startSurveyBtn, name: "Start survey button" },
    { element: createSurveyBtn, name: "Create survey button" },
    { element: surveyForm, name: "Survey form" },
    { element: surveyModal, name: "Survey modal" },
  ];

  let missingElements = false;
  requiredElements.forEach(({ element, name }) => {
    if (!element) {
      console.error(`[ERROR] ${name} not found.`);
      missingElements = true;
    } else {
      console.log(`[DEBUG] ${name} found in DOM.`);
    }
  });

  if (missingElements) {
    console.error("[ERROR] Modal or its elements are not found in the DOM.");
    return;
  }

  console.log("[INFO] All required elements found. Initializing WebSocket...");
  const surveySocket = new WebSocket(
    `ws://${window.location.host}/ws/surveys/`
  );

  surveySocket.onopen = () => {
    console.log("[INFO] WebSocket connection established.");
  };

  surveySocket.onclose = (event) => {
    console.warn("[WARNING] WebSocket connection closed.", event);
  };

  surveySocket.onerror = (error) => {
    console.error("[ERROR] WebSocket encountered an error:", error);
  };

  surveySocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("[DEBUG] Message received from WebSocket:", data);

    if (data.type === "survey_update") {
      console.log("[INFO] Updating survey results...");
      data.results.forEach((result, index) => {
        const progressBar = document.getElementById(`progress-${index}`);
        if (progressBar) {
          console.log(
            `[DEBUG] Updating progress for option ${index}: ${result.percentage}%`
          );
          progressBar.style.width = `${result.percentage}%`;
        } else {
          console.warn(`[WARNING] Progress bar for option ${index} not found.`);
        }
      });
    }

    if (data.type === "survey_end") {
      console.log("[INFO] Ending survey...");
      endSurveyBtn.classList.add("d-none");
      surveyContainer.classList.add("d-none");
      startSurveyBtn.disabled = false;
      startSurveyBtn.textContent = "Start Survey";
    }
  };

  startSurveyBtn.addEventListener("click", () => {
    console.log("[INFO] Start Survey Button clicked. Opening modal...");

    // Mostrar el modal
    $(`#${surveyModal.id}`).modal("show");

    // Asegurar aria-hidden sea false
    surveyModal.setAttribute("aria-hidden", "false");
    console.log("[DEBUG] surveyModal aria-hidden set to false.");
  });

  $(".btn-close").on("click", () => {
    console.log("[INFO] Closing survey modal...");

    // Ocultar el modal
    $(`#${surveyModal.id}`).modal("hide");

    // Asegurar aria-hidden sea true
    surveyModal.setAttribute("aria-hidden", "true");
    console.log("[DEBUG] surveyModal aria-hidden set to true.");

    // Reiniciar el formulario
    surveyForm.reset();
    const optionsContainer = document.getElementById("surveyOptionsContainer");
    optionsContainer.innerHTML = ""; // Limpiar opciones
  });

  endSurveyBtn.addEventListener("click", () => {
    console.log(
      "[INFO] End survey button clicked. Sending end_survey signal..."
    );
    surveySocket.send(JSON.stringify({ type: "end_survey" }));
    endSurveyBtn.classList.add("d-none");
    startSurveyBtn.disabled = false;
    startSurveyBtn.textContent = "Start Survey";
  });

  createSurveyBtn.addEventListener("click", (event) => {
    console.log(
      "[INFO] Create survey button clicked. Preparing survey data..."
    );
    event.preventDefault();

    const question = document.getElementById("surveyQuestion").value.trim();
    const options = Array.from(
      document.querySelectorAll("#surveyOptionsContainer input")
    )
      .map((input) => input.value.trim())
      .filter((value) => value !== "");

    const duration = document.getElementById("surveyDuration").value.trim();
    console.log("[DEBUG] Collected survey data:", {
      question,
      options,
      duration,
    });

    if (!question || options.length < 2) {
      console.error(
        "[ERROR] Invalid survey data. Question or options missing."
      );
      alert("Please provide a valid question and at least two options.");
      return;
    }

    if (surveySocket.readyState !== WebSocket.OPEN) {
      console.error("[ERROR] WebSocket is not open. Cannot send survey data.");
      alert("Cannot create survey: WebSocket connection is not open.");
      return;
    }

    console.log("[INFO] Sending survey to WebSocket...");
    surveySocket.send(
      JSON.stringify({
        type: "start_survey",
        question,
        options,
        duration: duration ? parseInt(duration, 10) : null,
      })
    );

    console.log("[INFO] Hiding modal and resetting form...");
    $(`#${surveyModal.id}`).modal("hide");
    surveyForm.reset();
    const optionsContainer = document.getElementById("surveyOptionsContainer");
    optionsContainer.innerHTML = "";
    console.log("[INFO] Survey form reset and modal closed.");
  });

  console.log("[INFO] Surveys script initialized successfully.");
});
