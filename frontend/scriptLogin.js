async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("Email").value;
    const password = document.getElementById("Senha").value;

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();

            const token = data.token;
            const balance = data.balance;
            const email = data.email;
            const user_id = data.user_id;
            const password = data.password;

            alert(`Login bem-sucedido!`);

            sessionStorage.setItem("authToken", token);
            sessionStorage.setItem("balance", balance);
            sessionStorage.setItem("email", email);
            sessionStorage.setItem("user_id", user_id);
            sessionStorage.setItem("password", password);

            window.location.href = "/indexaftertoken.html";
        } else {
            const error = await response.text();
            alert(`Erro ao logar: ${error}`);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro na requisição. Tente novamente mais tarde.");
    }
}
