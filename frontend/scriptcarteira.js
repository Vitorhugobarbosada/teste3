// Função principal para atualizar os campos dinâmicos
function paymentMethod(method) {
    const dynamicFields = document.getElementById('dynamicFields'); // Container para os campos dinâmicos

    // Limpa os campos dinâmicos antes de adicionar novos
    dynamicFields.innerHTML = '';

    if (method === 'pix') {
        // Adiciona os campos específicos para Pix
        dynamicFields.innerHTML = `
            <div class="form-floating mb-2" style="box-shadow: rgba(0, 0, 0, 0.534) 0px 3px 5px">
                <input type="text" class="form-control" id="pixKey" placeholder="Chave Pix">
                <label for="pixKey">Chave Pix (CPF ou Email)</label>
            </div>`;
    } else if (method === 'banco') {
        // Adiciona os campos específicos para Transferência Bancária
        dynamicFields.innerHTML = `
            <div class="form-floating mb-2" style="box-shadow: rgba(0, 0, 0, 0.534) 0px 3px 5px">
                <input type="text" class="form-control" id="contaCorrente" placeholder="Conta Corrente">
                <label for="contaCorrente">Conta Corrente</label>
            </div>
            <div class="form-floating mb-2" style="box-shadow: rgba(0, 0, 0, 0.534) 0px 3px 5px">
                <input type="text" class="form-control" id="banco" placeholder="Banco">
                <label for="banco">Banco</label>
            </div>`;
    }
}

// Adicionando o evento de mudança para o select de método de pagamento
document.getElementById('category').addEventListener('change', (event) => {
    const method = event.target.value; // Obtém o valor da opção selecionada
    paymentMethod(method); // Chama a função para atualizar os campos
});
