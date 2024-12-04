document.addEventListener("DOMContentLoaded", () => {
    const surveyContainer = document.getElementById("active-survey");
    const surveyQuestion = document.getElementById("survey-question");
    const surveyOptions = document.getElementById("survey-options");
    const endSurveyBtn = document.getElementById("end-survey-btn");
    const startSurveyBtn = document.getElementById("startSurveyButton"); // Botón para iniciar encuesta
    const createSurveyBtn = document.getElementById("createSurveyButton"); // Botón dentro del modal
    const surveyForm = document.getElementById("surveyForm"); // Formulario de encuesta
    const surveyModal = document.getElementById("surveyModal"); // Modal de encuesta

    // WebSocket para encuestas
    const surveySocket = new WebSocket(`ws://${window.location.host}/ws/surveys/`);

    surveySocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "survey_start") {
            surveyContainer.classList.remove("d-none");
            surveyQuestion.textContent = data.question;
            surveyOptions.innerHTML = "";

            // Renderizar las opciones de la encuesta
            data.options.forEach((option, index) => {
                const optionElement = document.createElement("div");
                optionElement.className = "option";
                optionElement.innerHTML = `
                    <span>${option.text}</span>
                    <div class="progress">
                        <div class="progress-bar" id="progress-${index}" style="width: 0%;"></div>
                    </div>
                `;

                optionElement.addEventListener("click", () => {
                    surveySocket.send(JSON.stringify({
                        type: "vote",
                        option: index
                    }));
                });

                surveyOptions.appendChild(optionElement);
            });

            // Mostrar el botón para finalizar encuesta
            endSurveyBtn.classList.remove("d-none");

            // Cambiar el botón de inicio de encuesta a deshabilitado
            startSurveyBtn.disabled = true;
            startSurveyBtn.textContent = "Survey Active";
        }

        if (data.type === "survey_update") {
            data.results.forEach((result, index) => {
                const progressBar = document.getElementById(`progress-${index}`);
                progressBar.style.width = `${result.percentage}%`;
            });
        }

        if (data.type === "survey_end") {
            endSurveyBtn.classList.add("d-none");
            surveyContainer.classList.add("d-none");
            startSurveyBtn.disabled = false;
            startSurveyBtn.textContent = "Start Survey";
        }
    };

    // Funcionalidad del botón para finalizar encuesta
    endSurveyBtn.addEventListener("click", () => {
        surveySocket.send(JSON.stringify({ type: "end_survey" }));
        endSurveyBtn.classList.add("d-none");
        startSurveyBtn.disabled = false;
        startSurveyBtn.textContent = "Start Survey";
    });

    // Funcionalidad del botón para crear encuesta
    createSurveyBtn.addEventListener("click", () => {
        const question = document.getElementById("surveyQuestion").value;
        const options = Array.from(document.querySelectorAll("#surveyOptionsContainer input"))
            .map(input => input.value)
            .filter(value => value.trim() !== ""); // Filtrar opciones vacías

        const duration = document.getElementById("surveyDuration").value;

        if (question && options.length >= 2) {
            // Enviar encuesta al backend a través del WebSocket
            surveySocket.send(JSON.stringify({
                type: "start_survey",
                question,
                options,
                duration: duration ? parseInt(duration, 10) : null
            }));

            // Cerrar modal de encuesta
            const bootstrapModal = bootstrap.Modal.getInstance(surveyModal);
            bootstrapModal.hide();

            // Limpiar formulario de encuesta
            surveyForm.reset();
        } else {
            alert("Please provide a question and at least two options.");
        }
    });
});
