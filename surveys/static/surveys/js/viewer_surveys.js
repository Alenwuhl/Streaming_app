document.addEventListener("DOMContentLoaded", () => {
  const isHost = document.body.dataset.isHost === "true";
  if (isHost) {
    console.log("[INFO] Skipping viewer_surveys.js for host.");
    return;
  }

  const surveySocket = new WebSocket(
    `ws://${window.location.host}/ws/surveys/`
  );
  const surveyContainer = document.getElementById("survey-container");
  const surveyForm = document.getElementById("active-survey");
  const surveyQuestion = document.getElementById("survey-question");
  const surveyOptions = document.getElementById("survey-options");

  surveySocket.onopen = () => {
    console.log("[INFO] Viewer WebSocket connection established.");
  };

  surveySocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "survey_start") {
      console.log("[INFO] Displaying active survey for viewer...");
      surveyForm.classList.remove("d-none");
      surveyQuestion.textContent = data.question;
      surveyOptions.innerHTML = "";

      data.options.forEach((option, index) => {
        const optionElement = document.createElement("div");
        optionElement.className = "option my-2";
        optionElement.innerHTML = `
            <div class="mb-2">
                <button class="btn btn-outline-primary btn-block vote-btn" data-index="${index}">
                    ${option}
                </button>
                <div class="progress mt-2">
                    <div id="progress-${index}" 
                         class="progress-bar" 
                         role="progressbar" 
                         style="width: 0%" 
                         aria-valuenow="0" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                <small class="text-muted" id="votes-${index}">0 votes</small>
            </div>
        `;

        const voteButton = optionElement.querySelector(".vote-btn");
        voteButton.addEventListener("click", () => {
          console.log(`[INFO] Voting for option ${index}`);
          surveySocket.send(
            JSON.stringify({
              type: "survey_update",
              option: index,
            })
          );
          surveyOptions.querySelectorAll(".vote-btn").forEach((btn) => {
            btn.disabled = true;
          });
        });

        surveyOptions.appendChild(optionElement);
      });
    }

    if (data.type === "survey_update") {
      console.log("[INFO] Updating survey results...", data.results);
      data.results.forEach((result, index) => {
        const progressBar = document.getElementById(`progress-${index}`);
        const votesElement = document.getElementById(`votes-${index}`);
        if (progressBar && votesElement) {
          progressBar.style.width = `${result.percentage}%`;
          votesElement.textContent = `${result.votes} vote${
            result.votes !== 1 ? "s" : ""
          }`;
        }
      });
    }
  };

  surveySocket.onclose = () => {
    console.log("[INFO] Viewer WebSocket connection closed.");
  };

  surveySocket.onerror = (error) => {
    console.error("[ERROR] Viewer WebSocket encountered an error:", error);
  };
});
