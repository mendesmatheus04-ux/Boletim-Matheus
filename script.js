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

// Instâncias Globais dos Gráficos (Chart.js)
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

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
    const txt3 = n3 !== null ? n3.toFixed(1).replace(".", ",")