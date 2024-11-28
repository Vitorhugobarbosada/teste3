document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
        alert("Você precisa estar logado!");
        window.location.href = "/login.html";
    } else {
        console.log("Usuário autenticado, token:", token);

        const addEventButton = document.getElementById("addEventBtn");
        addEventButton.addEventListener("click", async function () {
            // Captura os valores do formulário
            const eventName = document.getElementById("titleEvent").value.trim();
            const eventDescription = document.getElementById("descEvent").value.trim();
            const date1 = document.getElementById("date1").value;
            const date2 = document.getElementById("date2").value;
            const team1 = document.getElementById("time1").value.trim();
            const team2 = document.getElementById("time2").value.trim();
            const categoria = document.getElementById("category").value;

            console.log(eventName, eventDescription, date1, date2, team1, team2, categoria);

            if (!eventName || !eventDescription || !date1 || !date2 || !team1 || !team2 || !categoria) {
                alert("Preencha todos os campos obrigatórios.");
                return;
            }

            // Monta o objeto para enviar ao backend
            const eventData = {
                email: sessionStorage.getItem("email"), // Substituir pelo e-mail do usuário autenticado
                event_name: eventName,
                event_description: eventDescription,
                team1: team1,
                team2: team2,
                date1: date1,
                date2: date2,
                categoria: categoria,
            };

            try {
                // Envia a requisição ao backend
                const response = await fetch("http://localhost:3000/addNewEvent", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(eventData),
                });

                if (response.ok) {
                    const message = await response.text();
                    alert(message);
                    window.location.href = "/addNewEvent.html";
                } else {
                    const errorMessage = await response.text();
                    alert(`Erro: ${errorMessage}`);
                }
            } catch (error) {
                console.error("Erro ao enviar evento:", error);
                alert("Erro ao conectar com o servidor. Tente novamente mais tarde.");
            }
        });
    }
});
