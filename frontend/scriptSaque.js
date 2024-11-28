document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
        alert("Você precisa estar logado!");
        window.location.href = "/login.html";
        return;
    }

    const addEventButton = document.getElementById("buttonWithdraw");
    const saqueValor = document.getElementById("saqueValor");
    const category = document.getElementById("category");
    const dynamicFields = document.getElementById("dynamicFields");

    // Inicializa o botão desativado
    addEventButton.setAttribute("disabled", "disabled");

    // Função para validar os campos
    function validateFields() {
        const valor = saqueValor.value.trim();
        const method = category.value;
        const pixKey = document.getElementById("pixKey")?.value.trim();
        const contaCorrente = document.getElementById("contaCorrente")?.value.trim();
        const agencia = document.getElementById("agencia")?.value.trim();

        console.log("Validando campos:", { valor, method, pixKey, contaCorrente, agencia });

        let isValid = false;

        if (method === "pix") {
            // Para PIX, é necessário um valor maior que 0 e a chave Pix
            isValid = valor && parseFloat(valor) > 0 && pixKey;
        } else if (method === "banco") {
            // Para Banco, é necessário um valor maior que 0 e dados de conta bancária
            isValid = valor && parseFloat(valor) > 0 && contaCorrente && agencia;
        }

        // Atualiza o estado do botão
        if (isValid) {
            addEventButton.removeAttribute("disabled");
        } else {
            addEventButton.setAttribute("disabled", "disabled");
        }
    }

    // Evento para mostrar os campos dinâmicos ao selecionar o método
    category.addEventListener("change", function () {
        const method = category.value;

        // Limpa os campos dinâmicos
        dynamicFields.innerHTML = "";

        if (method === "pix") {
            // Adiciona o campo de Chave Pix
            dynamicFields.innerHTML = `
                <div class="form-floating mb-2" style="box-shadow: rgba(0, 0, 0, 0.534) 0px 3px 5px">
                    <input type="text" class="form-control" id="pixKey" placeholder="Chave Pix">
                    <label for="pixKey">Chave Pix (CPF ou Email)</label>
                </div>`;

            // Adiciona evento de validação ao campo Pix
            const pixKeyInput = document.getElementById("pixKey");
            pixKeyInput.addEventListener("input", validateFields);
        } else if (method === "banco") {
            // Adiciona os campos específicos para Transferência Bancária
            dynamicFields.innerHTML = `
                <div class="form-floating mb-2" style="box-shadow: rgba(0, 0, 0, 0.534) 0px 3px 5px">
                    <input type="text" class="form-control" id="contaCorrente" placeholder="Conta Corrente">
                    <label for="contaCorrente">Conta Corrente</label>
                </div>
                <div class="form-floating mb-2" style="box-shadow: rgba(0, 0, 0, 0.534) 0px 3px 5px">
                    <input type="text" class="form-control" id="agencia" placeholder="Agência">
                    <label for="agencia">Agência</label>
                </div>`;

            // Adiciona eventos de validação aos campos Banco e Conta Corrente
            const contaCorrenteInput = document.getElementById("contaCorrente");
            contaCorrenteInput.addEventListener("input", validateFields);
            const agenciaInput = document.getElementById("agencia");
            agenciaInput.addEventListener("input", validateFields);
        }

        // Valida os campos ao mudar o método
        validateFields();
    });

    // Eventos de validação para os campos principais
    saqueValor.addEventListener("input", validateFields);

    // Evento de clique no botão de saque
    addEventButton.addEventListener("click", async function () {
        const valor = saqueValor.value.trim();
        const method = category.value;
        const pixKey = document.getElementById("pixKey")?.value.trim();
        const contaCorrente = document.getElementById("contaCorrente")?.value.trim();
        const agencia = document.getElementById("agencia")?.value.trim();
        const user_id = sessionStorage.getItem("user_id");

        // Valida novamente os campos antes de enviar
        const withdrawData = {
            amount: valor,
            userId: user_id,
            transferType: method,
            pixKey: method === "pix" ? pixKey : undefined,
            contaCorrente: method === "banco" ? contaCorrente : undefined,
            agencia: method === "banco" ? agencia : undefined,
        };

        console.log("Enviando dados de saque:", withdrawData); // Log para depuração

        try {
            const response = await fetch("http://localhost:3000/withdrawFunds", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(withdrawData),
            });

            if (response.ok) {
                const message = await response.text();
                alert(message);

                // Atualiza o saldo
                const email = sessionStorage.getItem("email");
                const password = sessionStorage.getItem("password");
                const loginResponse = await fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (loginResponse.ok) {
                    const data = await loginResponse.json();
                    sessionStorage.setItem("balance", data.balance);
                    window.location.href = "/saque.html";
                } else {
                    const error = await loginResponse.text();
                    alert(`Erro ao obter novo saldo: ${error}`);
                }
            } else {
                const errorMessage = await response.text();
                alert(`Erro: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Erro ao sacar:", error);
            alert("Erro ao conectar com o servidor. Tente novamente mais tarde.");
        }
    });
});