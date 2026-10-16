// Configuração Fixa do Aluno
const CONFIG_ALUNO = {
  turma: "8A",
  numeroChamada: 24,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// Dados fictícios padronizados nativos do projeto (Fallback)
const dadosBoletimPadrao = [
  { disciplina: "Língua Portuguesa", tri1: 82, tri2: "7,8", tri3: 85, faltas: [2, 1, 1] },
  { disciplina: "Matemática", tri1: 52, tri2: "5,8", tri3: null, faltas: [3, 2, 1] },
  { disciplina: "Ciências", tri1: "8,1", tri2: 76, tri3: 8.0, faltas: [1, 2, 0] },
  { disciplina: "História", tri1: 7.0, tri2: 84, tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Geografia", tri1: 68, tri2: 7.3, tri3: "7,9", faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 86, tri2: "8,1", tri3: 8.7, faltas: [1, 0, 0] },
  { disciplina: "Arte", tri1: 9.0, tri2: 92, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 95, tri2: 9.0, tri3: "9,4", faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 88, tri2: 9.1, tri3: 93, faltas: [1, 0, 1] },
  { disciplina: "Educação Financeira", tri1: 74, tri2: "7,8", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Estudo Orientado", tri1: 8.0, tri2: 83, tri3: "8,5", faltas: [0, 1, 0] },
  { disciplina: "Redação e Leitura", tri1: 62, tri2: "6,8", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 48, tri2: 5.6, tri3: "6,0", faltas: [2, 2, 1] },
  { disciplina: "Literatura Arte e Movimento", tri1: "7,7", tri2: 80, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Práticas Experimentais", tri1: 58, tri2: "6,2", tri3: 6.4, faltas: [1, 1, 1] }
];

// Estado da sessão (mantido apenas em memória)
let pinSessao = "";
let dadosAtuais = [];

// Função para normalizar qualquer nota antiga do projeto para a escala de 0 a 10
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  let num = Number(String(valor).replace(",", "."));

  if (isNaN(num)) {
    return null;
  }

  if (num > 10 && num <= 100) {
    num = num / 10;
  }

  if (num >= 0 && num <= 10) {
    return num;
  }

  return null;
}

// Função para fazer login e abrir o boletim via API
async function fazerLogin() {
  const inputPin = document.getElementById("pin-input");
  const msgStatus = document.getElementById("mensagem-status");
  const btnEntrar = document.getElementById("btn-entrar");

  const pinDigitado = inputPin.value.trim();

  if (!pinDigitado) {
    msgStatus.textContent = "Digite o PIN para entrar.";
    msgStatus.style.color = "#f75a68";
    return;
  }

  msgStatus.textContent = "Conectando...";
  msgStatus.style.color = "#a8a8b3";
  btnEntrar.disabled = true;

  try {
    const response = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    if (response.status === 401) {
      msgStatus.textContent = "Turma, chamada ou PIN inválidos.";
      msgStatus.style.color = "#f75a68";
      btnEntrar.disabled = false;
      return;
    }

    if (response.status === 429) {
      msgStatus.textContent = "Muitas tentativas. Aguarde um minuto e tente novamente.";
      msgStatus.style.color = "#f75a68";
      btnEntrar.disabled = false;
      return;
    }

    if (!response.ok) {
      msgStatus.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
      msgStatus.style.color = "#f75a68";
      btnEntrar.disabled = false;
      return;
    }

    const json = await response.json();

    // Salva o PIN exclusivamente em memória e limpa o campo do DOM
    pinSessao = pinDigitado;
    inputPin.value = "";

    // Oculta área de login e exibe o conteúdo do boletim
    document.getElementById("area-login").classList.add("escondido");
    document.getElementById("conteudo-boletim").classList.remove("escondido");

    // Processa os dados retornados ou usa o fallback
    if (json.dados && Array.isArray(json.dados.disciplinas) && json.dados.disciplinas.length > 0) {
      dadosAtuais = json.dados.disciplinas;
    } else {
      dadosAtuais = JSON.parse(JSON.stringify(dadosBoletimPadrao));
    }

    renderizarBoletim();

  } catch (error) {
    msgStatus.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    msgStatus.style.color = "#f75a68";
  } finally {
    btnEntrar.disabled = false;
  }
}

// Renderiza a tabela principal e os cards de resumo de forma segura
function renderizarBoletim() {
  const tabelaCorpo = document.getElementById("tabela-corpo");
  tabelaCorpo.innerHTML = "";

  let somaMediasGerais = 0;
  let qtdDisciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let qtdBomDesempenho = 0;
  let qtdAtencao = 0;

  dadosAtuais.forEach((item) => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const notasValidas = [n1, n2, n3].filter((n) => n !== null);
    let media = null;
    let situacao = "Nota ainda não disponível";
    let classeSituacao = "situacao-indisponivel";

    if (notasValidas.length > 0) {
      const soma = notasValidas.reduce((acc, curr) => acc + curr, 0);
      media = soma / notasValidas.length;

      somaMediasGerais += media;
      qtdDisciplinasComMedia++;

      if (media >= 6.0) {
        situacao = "Bom desempenho";
        classeSituacao = "situacao-bom";
        qtdBomDesempenho++;
      } else {
        situacao = "Atenção";
        classeSituacao = "situacao-atencao";
        qtdAtencao++;
      }
    }

    const arrFaltas = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    const totalFaltasDisciplina = arrFaltas.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    totalFaltasGeral += totalFaltasDisciplina;

    const txt1 = n1 !== null ? n1.toFixed(1).replace(".", ",") : "—";
    const txt2 = n2 !== null ? n2.toFixed(1).replace(".", ",") : "—";
    const txt3 = n3 !== null ? n3.toFixed(1).replace(".", ",") : "—";
    const txtMedia = media !== null ? media.toFixed(1).replace(".", ",") : "—";

    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    const strongNome = document.createElement("strong");
    strongNome.textContent = item.disciplina || "";
    tdNome.appendChild(strongNome);

    const td1 = document.createElement("td");
    td1.textContent = txt1;

    const td2 = document.createElement("td");
    td2.textContent = txt2;

    const td3 = document.createElement("td");
    td3.textContent = txt3;

    const tdMedia = document.createElement("td");
    const strongMedia = document.createElement("strong");
    strongMedia.textContent = txtMedia;
    tdMedia.appendChild(strongMedia);

    const tdFaltas = document.createElement("td");
    tdFaltas.textContent = String(totalFaltasDisciplina);

    const tdSituacao = document.createElement("td");
    tdSituacao.className = classeSituacao;
    tdSituacao.textContent = situacao;

    tr.appendChild(tdNome);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(tdMedia);
    tr.appendChild(tdFaltas);
    tr.appendChild(tdSituacao);

    tabelaCorpo.appendChild(tr);
  });

  const mediaGeralCalculada = qtdDisciplinasComMedia > 0 
    ? (somaMediasGerais / qtdDisciplinasComMedia).toFixed(1).replace(".", ",") 
    : "—";

  document.getElementById("card-media").textContent = mediaGeralCalculada;
  document.getElementById("card-faltas").textContent = String(totalFaltasGeral);
  document.getElementById("card-bom-desempenho").textContent = String(qtdBomDesempenho);
  document.getElementById("card-atencao").textContent = String(qtdAtencao);
  document.getElementById("card-frequencia").textContent = "92%";
}

// Abre a interface de edição
function abrirEdicao() {
  const areaEdicao = document.getElementById("area-edicao");
  const tabelaEdicaoCorpo = document.getElementById("tabela-edicao-corpo");
  const msgEdicao = document.getElementById("mensagem-status-edicao");

  msgEdicao.textContent = "";
  tabelaEdicaoCorpo.innerHTML = "";

  dadosAtuais.forEach((item, index) => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const arrFaltas = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    const f1 = arrFaltas[0] !== undefined ? arrFaltas[0] : 0;
    const f2 = arrFaltas[1] !== undefined ? arrFaltas[1] : 0;
    const f3 = arrFaltas[2] !== undefined ? arrFaltas[2] : 0;

    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    const strongNome = document.createElement("strong");
    strongNome.textContent = item.disciplina || "";
    tdNome.appendChild(strongNome);

    const tdN1 = document.createElement("td");
    tdN1.innerHTML = `<input type="text" id="edit-n1-${index}" value="${n1 !== null ? String(n1).replace(".", ",") : ""}">`;

    const tdN2 = document.createElement("td");
    tdN2.innerHTML = `<input type="text" id="edit-n2-${index}" value="${n2 !== null ? String(n2).replace(".", ",") : ""}">`;

    const tdN3 = document.createElement("td");
    tdN3.innerHTML = `<input type="text" id="edit-n3-${index}" value="${n3 !== null ? String(n3).replace(".", ",") : ""}">`;

    const tdF1 = document.createElement("td");
    tdF1.innerHTML = `<input type="text" id="edit-f1-${index}" value="${f1}">`;

    const tdF2 = document.createElement("td");
    tdF2.innerHTML = `<input type="text" id="edit-f2-${index}" value="${f2}">`;

    const tdF3 = document.createElement("td");
    tdF3.innerHTML = `<input type="text" id="edit-f3-${index}" value="${f3}">`;

    tr.appendChild(tdNome);
    tr.appendChild(tdN1);
    tr.appendChild(tdN2);
    tr.appendChild(tdN3);
    tr.appendChild(tdF1);
    tr.appendChild(tdF2);
    tr.appendChild(tdF3);

    tabelaEdicaoCorpo.appendChild(tr);
  });

  areaEdicao.classList.remove("escondido");
}

function fecharEdicao() {
  document.getElementById("area-edicao").classList.add("escondido");
}

// Validação estrita para notas editadas (0 a 10 ou vazio)
function validarNotaDigitada(strValor, campoElem) {
  const texto = String(strValor).trim();
  campoElem.classList.remove("campo-invalido");

  if (texto === "") {
    return { valido: true, valor: null };
  }

  const num = Number(texto.replace(",", "."));

  if (isNaN(num) || num < 0 || num > 10) {
    campoElem.classList.add("campo-invalido");
    return { valido: false, valor: null };
  }

  return { valido: true, valor: num };
}

// Validação estrita para faltas editadas (inteiro >= 0)
function validarFaltaDigitada(strValor, campoElem) {
  const texto = String(strValor).trim();
  campoElem.classList.remove("campo-invalido");

  if (texto === "") {
    campoElem.classList.add("campo-invalido");
    return { valido: false, valor: null };
  }

  const num = Number(texto);

  if (!Number.isInteger(num) || num < 0) {
    campoElem.classList.add("campo-invalido");
    return { valido: false, valor: null };
  }

  return { valido: true, valor: num };
}

// Salva alterações validadas via requisição PUT na API
async function salvarAlteracoes() {
  const msgEdicao = document.getElementById("mensagem-status-edicao");
  let possuiErros = false;
  const disciplinasAtualizadas = [];

  dadosAtuais.forEach((item, index) => {
    const elN1 = document.getElementById(`edit-n1-${index}`);
    const elN2 = document.getElementById(`edit-n2-${index}`);
    const elN3 = document.getElementById(`edit-n3-${index}`);

    const elF1 = document.getElementById(`edit-f1-${index}`);
    const elF2 = document.getElementById(`edit-f2-${index}`);
    const elF3 = document.getElementById(`edit-f3-${index}`);

    const vN1 = validarNotaDigitada(elN1.value, elN1);
    const vN2 = validarNotaDigitada(elN2.value, elN2);
    const vN3 = validarNotaDigitada(elN3.value, elN3);

    const vF1 = validarFaltaDigitada(elF1.value, elF1);
    const vF2 = validarFaltaDigitada(elF2.value, elF2);
    const vF3 = validarFaltaDigitada(elF3.value, elF3);

    if (!vN1.valido || !vN2.valido || !vN3.valido || !vF1.valido || !vF2.valido || !vF3.valido) {
      possuiErros = true;
    }

    disciplinasAtualizadas.push({
      disciplina: item.disciplina,
      tri1: vN1.valor,
      tri2: vN2.valor,
      tri3: vN3.valor,
      faltas: [vF1.valor, vF2.valor, vF3.valor]
    });
  });

  if (possuiErros) {
    msgEdicao.textContent = "Verifique os campos destacados em vermelho. Notas devem ser de 0 a 10 e faltas números inteiros.";
    msgEdicao.style.color = "#f75a68";
    return;
  }

  msgEdicao.textContent = "Salvando...";
  msgEdicao.style.color = "#a8a8b3";

  try {
    const response = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinSessao,
        dados: {
          disciplinas: disciplinasAtualizadas
        }
      })
    });

    if (!response.ok) {
      msgEdicao.textContent = "Não foi possível salvar as alterações. Tente novamente.";
      msgEdicao.style.color = "#f75a68";
      return;
    }

    dadosAtuais = disciplinasAtualizadas;
    renderizarBoletim();
    fecharEdicao();

    msgEdicao.textContent = "Dados salvos com sucesso.";
    msgEdicao.style.color = "#00b37e";

  } catch (error) {
    msgEdicao.textContent = "Não foi possível conectar ao servidor para salvar. Tente novamente.";
    msgEdicao.style.color = "#f75a68";
  }
}