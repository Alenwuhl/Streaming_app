function addSurveyOption() {
  console.log("[INFO] Adding a new survey option...");
  const optionsContainer = document.getElementById("surveyOptionsContainer");
  if (!optionsContainer) {
    console.error("[ERROR] Options container not found.");
    return;
  }

  const optionCount = optionsContainer.childElementCount + 1;
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
  const mainContainer = document.querySelector("[data-is-host]");
  if (!mainContainer) {
    console.error("[ERROR] Main container with data-is-host not found.");
    return;
  }

  const isHost = mainContainer.getAttribute("data-is-host") === "true";
  if (!isHost) {
    console.log("[INFO] Skipping surveys.js for viewer.");
    return;
  }

  const surveyContainer = document.getElementById("active-survey");
  const surveyQuestion = document.getElementById("survey-question");
  const surveyOptions = document.getElementById("survey-options");
  const endSurveyBtn = document.getElementById("end-survey-btn");
  const startSurveyBtn = document.getElementById("startSurveyButton");
  const createSurveyBtn = document.getElementById("createSurveyButton");
  const surveyForm = document.getElementById("surveyForm");
  const surveyModal = document.getElementById("surveyModal");
  
  const surveySocket = new WebSocket(`ws://${window.location.host}/ws/surveys/`);

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
    console.log("[DEBUG] Host received message from WebSocket:", data);

    if (data.type === "survey_start") {
      surveyContainer.classList.remove("d-none");
      surveyQuestion.textContent = data.question;
      surveyOptions.innerHTML = "";
      
      data.options.forEach((option) => {
        const optionElement = document.createElement("div");
        optionElement.className = "survey-option my-2";
        optionElement.innerHTML = `
          <span class="option-text">${option.text}</span>
          <span class="option-votes badge badge-secondary ml-2">0</span>
        `;
        surveyOptions.appendChild(optionElement);
      });
      console.log("[INFO] Encuesta activa mostrada correctamente.");
    }

    if (data.type === "survey_update") {
      console.log("[INFO] Updating survey results for host...");
      data.results.forEach((result, index) => {
        const votesElement = document.querySelectorAll(".option-votes")[index];
        if (votesElement) {
          votesElement.textContent = `${result.votes} votes`;
        }
      });
    }
  };

  createSurveyBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const question = document.getElementById("surveyQuestion").value.trim();
    const options = Array.from(document.querySelectorAll("#surveyOptionsContainer input"))
      .map((input) => input.value.trim())
      .filter((value) => value !== "");
    const duration = document.getElementById("surveyDuration").value.trim();

    if (!question || options.length < 2) {
      console.error("[ERROR] Invalid survey data. Question or options missing.");
      alert("Please provide a valid question and at least two options.");
      return;
    }

    if (surveySocket.readyState !== WebSocket.OPEN) {
      console.warn("[WARNING] WebSocket is not open. Retrying in 1 second...");
      setTimeout(() => {
        if (surveySocket.readyState === WebSocket.OPEN) {
          sendSurvey();
        } else {
          console.error("[ERROR] WebSocket is still not open. Cannot send survey data.");
          alert("Cannot create survey: WebSocket connection is not open.");
        }
      }, 1000);
    } else {
      sendSurvey();
    }

    function sendSurvey() {
      console.log("[INFO] Sending survey to WebSocket...");
      surveySocket.send(
        JSON.stringify({
          type: "start_survey",
          question,
          options: options.map((text) => ({ text })),
          duration: duration ? parseInt(duration, 10) : null,
        })
      );
      $(`#${surveyModal.id}`).modal("hide");
      surveyForm.reset();
      document.getElementById("surveyOptionsContainer").innerHTML = "";
      console.log("[INFO] Survey form reset and modal closed.");
    }
  });

  console.log("[INFO] Surveys script initialized successfully.");
});