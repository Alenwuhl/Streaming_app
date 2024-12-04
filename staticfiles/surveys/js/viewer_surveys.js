document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] Viewer survey logic initialized.");
  
    const isHost = document.body.dataset.isHost === "true";
    if (isHost) {
      console.log("[INFO] Skipping viewer_surveys.js for host.");
      return;
    }
  
    const surveySocket = new WebSocket(`ws://${window.location.host}/ws/surveys/`);
    const surveyContainer = document.getElementById("active-survey");
    const surveyQuestion = document.getElementById("survey-question");
    const surveyOptions = document.getElementById("survey-options");
  
    surveySocket.onopen = () => {
      console.log("[INFO] Viewer WebSocket connection established.");
    };
  
    surveySocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("[DEBUG] Message received from WebSocket:", data);
  
      if (data.type === "survey_start") {
        console.log("[INFO] Displaying active survey for viewer...");
        surveyContainer.classList.remove("d-none");
        surveyQuestion.textContent = data.question;
        surveyOptions.innerHTML = "";
  
        data.options.forEach((option, index) => {
          console.log(`[DEBUG] Rendering option ${index + 1}:`, option);
  
          const optionElement = document.createElement("div");
          optionElement.className = "option my-2";
          optionElement.innerHTML = `
            <button class="btn btn-outline-primary btn-block">${option.text}</button>
          `;
          optionElement.addEventListener("click", () => {
            console.log(`[INFO] Viewer voting for option ${index}`);
            surveySocket.send(JSON.stringify({ type: "vote", option: index }));
          });
  
          surveyOptions.appendChild(optionElement);
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
  