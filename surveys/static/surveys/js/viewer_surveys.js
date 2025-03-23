function getStreamIdFromURL() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const maybeId = pathParts[pathParts.length - 1];
  return /^\d+$/.test(maybeId) ? maybeId : null;
}

document.addEventListener("DOMContentLoaded", () => {
  const isHost = document.body.dataset.isHost === "true";
  if (isHost) return;

  const streamId = getStreamIdFromURL();
  if (!streamId) return;

  const surveySocket = new WebSocket(
    `ws://${window.location.host}/ws/surveys/${streamId}/`
  );
  const surveyForm = document.getElementById("active-survey");
  const surveyQuestion = document.getElementById("survey-question");
  const surveyOptions = document.getElementById("survey-options");

  const votedOptionIds = new Set(); // Para prevenir múltiples votos

  surveySocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "survey_start") {
      surveyForm.classList.remove("d-none");
      surveyQuestion.textContent = data.question;
      surveyOptions.innerHTML = "";

      data.options.forEach((option) => {
        const optionId = option.id;

        const optionElement = document.createElement("div");
        optionElement.className = "option my-3";
        optionElement.innerHTML = `
          <button class="btn btn-outline-primary btn-block vote-btn" data-option-id="${optionId}">
            ${option.text}
          </button>
          <div class="progress mt-2">
            <div class="progress-bar" id="progress-${optionId}" role="progressbar" 
                 style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
            </div>
          </div>
          <small class="text-muted" id="percentage-${optionId}">0%</small>
        `;

        const voteButton = optionElement.querySelector(".vote-btn");
        voteButton.addEventListener("click", () => {
          if (votedOptionIds.has(optionId)) return;
          surveySocket.send(
            JSON.stringify({
              type: "survey_update",
              option_id: optionId,
            })
          );
          votedOptionIds.add(optionId);
          surveyOptions
            .querySelectorAll(".vote-btn")
            .forEach((btn) => (btn.disabled = true));
        });

        surveyOptions.appendChild(optionElement);
      });
    }

    if (data.type === "survey_update") {
      data.results.forEach((result) => {
        const optionId = result.option_id;
        const percentage = result.percentage.toFixed(1);
        const progress = document.getElementById(`progress-${optionId}`);
        const label = document.getElementById(`percentage-${optionId}`);
        if (progress && label) {
          progress.style.width = `${percentage}%`;
          progress.setAttribute("aria-valuenow", percentage);
          label.textContent = `${percentage}%`;
        }
      });
    }
  };
});
