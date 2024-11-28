document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("authToken");

    // Verifica se o token está presente
    if (!token) {
        alert("Você precisa estar logado!");
        window.location.href = "/login.html";
        return; // Impede a execução do restante do código
    }

    console.log("Usuário autenticado, token:", token);

    // Captura o botão
    const addFundsButton = document.getElementById("buttonAddFunds");

    // Adiciona o evento de clique
    addFundsButton.addEventListener("click", async function () {
        const user_id = sessionStorage.getItem("user_id");
        const valor = document.getElementById("Valor").value;
        const cardNumber = document.getElementById("cardNumber").value;
        const cardName = document.getElementById("cardName").value;
        const cardExpiration = document.getElementById("cardDate").value;
        const cardCVV = document.getElementById("cardCVV").value;

        // Validação dos campos
        if (!valor || !cardNumber || !cardName || !cardExpiration || !cardCVV) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const addFundsData = {
            userId: user_id,
            amount: valor,
            cardNumber: cardNumber,
            cardName: cardName,
            cardExpiration: cardExpiration,
            cardCVV: cardCVV
        };

        console.log(addFundsData);

        try {
            const response = await fetch("http://localhost:3000/addFunds", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(addFundsData),
            });

            if (response.ok) {
                const message = await response.text();
                alert(message);
                try {
                    const email = sessionStorage.getItem("email");
                    const password = sessionStorage.getItem("password");
                    const response = await fetch("http://localhost:3000/login", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email, password })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const balance = data.balance;
                        sessionStorage.setItem("balance", balance);
                        window.location.href = "/addFunds.html";
                    }
                    else {
                        const error = await response.text();
                        alert(`Erro ao obter novo saldo: ${error}`);
                    }
                } catch (error) {
                    console.error("Erro na requisição:", error);
                    alert("Erro na requisição. Tente novamente mais tarde.");
                }
            } else {
                const errorMessage = await response.text();
                alert(`Erro: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Erro ao depositar:", error);
            alert("Erro ao conectar com o servidor. Tente novamente mais tarde.");
        }
    });
});