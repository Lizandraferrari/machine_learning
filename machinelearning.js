
/***************************************
Árvore de Decisão (ID3) com TODOS os atributos da base UCI
***************************************/

const XLSX = require('xlsx');
const fs = require('fs');

/* -------------------------
1) Ler planilha e montar dataset
------------------------- */
function lerDatasetPlanilha(caminhoArquivo) {
  const workbook = XLSX.readFile(caminhoArquivo);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const dataset = [];

  for (const row of jsonData) {
    const resultado = row['Target']; // Rótulo
    let rotulo;
    if (resultado === 'Dropout') rotulo = 0;
    else if (resultado === 'Enrolled') rotulo = 1;
    else if (resultado === 'Graduate') rotulo = 2;
    else continue;

    const obj = {};
    for (const key in row) {
      if (key === 'Target') continue;
      obj[key] = isNaN(Number(row[key])) ? row[key] : Number(row[key]);
    }
    obj.dropout = rotulo;

    dataset.push(obj);
  }

  return dataset;
}

/* -------------------------
2) Funções auxiliares ID3
------------------------- */
function entropy(subset) {
  if (subset.length === 0) return 0;
  const counts = subset.reduce((acc, r) => {
    acc[r.dropout] = (acc[r.dropout] || 0) + 1;
    return acc;
  }, {});
  const total = subset.length;
  return Object.values(counts).reduce((e, c) => {
    const p = c / total;
    return e - p * Math.log2(p);
  }, 0);
}

function partition(subset, attribute, threshold = null) {
  if (threshold === null) {
    const map = {};
    for (const row of subset) {
      const val = row[attribute];
      if (!map[val]) map[val] = [];
      map[val].push(row);
    }
    return { type: 'categorical', parts: map };
  } else {
    const left = [], right = [];
    for (const row of subset) {
      if (row[attribute] <= threshold) left.push(row);
      else right.push(row);
    }
    return { type: 'numeric', parts: { '<=': left, '>': right } };
  }
}

function informationGain(subset, partitionResult) {
  const baseEnt = entropy(subset);
  const total = subset.length;
  let remainder = 0;
  for (const partKey in partitionResult.parts) {
    const part = partitionResult.parts[partKey];
    const w = part.length / total;
    remainder += w * entropy(part);
  }
  return baseEnt - remainder;
}

/* -------------------------
3) Melhor divisão
------------------------- */
function bestSplit(subset, attributes) {
  let best = { gain: -Infinity, attribute: null, threshold: null, partition: null };
  const baseEnt = entropy(subset);
  if (baseEnt === 0) return best;

  for (const attr of attributes) {
    const sampleVal = subset.find(r => r[attr] !== undefined)?.[attr];
    if (sampleVal === undefined) continue;

    if (typeof sampleVal === 'number') {
      const vals = Array.from(new Set(subset.map(r => r[attr]))).sort((a,b)=>a-b);
      if (vals.length <= 1) continue;
      for (let i=0; i<vals.length-1; i++) {
        const threshold = (vals[i] + vals[i+1]) / 2;
        const part = partition(subset, attr, threshold);
        const gain = informationGain(subset, part);
        if (gain > best.gain) {
          best = { gain, attribute: attr, threshold, partition: part };
        }
      }
    } else {
      const part = partition(subset, attr, null);
      const gain = informationGain(subset, part);
      if (gain > best.gain) {
        best = { gain, attribute: attr, threshold: null, partition: part };
      }
    }
  }

  return best;
}

/* -------------------------
4) Construir Árvore
------------------------- */
function majorityClass(subset) {
  const counts = subset.reduce((acc, r) => {
    acc[r.dropout] = (acc[r.dropout] || 0) + 1;
    return acc;
  }, {});
  return Object.keys(counts).reduce((a,b)=> counts[a] >= counts[b] ? a : b);
}

function buildTree(subset, attributes, minSamples = 5, depth = 0, maxDepth = 10) {
  if (subset.length === 0) return { type: 'leaf', class: 0 };

  const classes = Array.from(new Set(subset.map(r => r.dropout)));
  if (classes.length === 1) return { type: 'leaf', class: classes[0] };

  if (attributes.length === 0 || subset.length <= minSamples || depth >= maxDepth) {
    return { type: 'leaf', class: Number(majorityClass(subset)) };
  }

  const split = bestSplit(subset, attributes);
  if (split.gain <= 1e-9 || !split.attribute) {
    return { type: 'leaf', class: Number(majorityClass(subset)) };
  }

  const node = { type: 'node', attribute: split.attribute, threshold: split.threshold, children: {} };

  if (split.threshold === null) {
    const newAttrs = attributes.filter(a => a !== split.attribute);
    for (const val in split.partition.parts) {
      node.children[val] = buildTree(split.partition.parts[val], newAttrs, minSamples, depth+1, maxDepth);
    }
  } else {
    node.children['<='] = buildTree(split.partition.parts['<='], attributes, minSamples, depth+1, maxDepth);
    node.children['>'] = buildTree(split.partition.parts['>'], attributes, minSamples, depth+1, maxDepth);
  }

  return node;
}

/* -------------------------
5) Classificação
------------------------- */
function classify(tree, row) {
  if (tree.type === 'leaf') return tree.class;
  const attr = tree.attribute;
  const val = row[attr];
  if (tree.threshold === null) {
    if (tree.children[val]) return classify(tree.children[val], row);
    const childClasses = Object.values(tree.children)
      .map(c => c.type === 'leaf' ? c.class : null)
      .filter(c => c !== null);
    if (childClasses.length > 0) {
      const counts = childClasses.reduce((acc,c)=>{acc[c]=(acc[c]||0)+1; return acc;}, {});
      return Number(Object.keys(counts).reduce((a,b)=> counts[a]>=counts[b]?a:b));
    }
    return 0;
  } else {
    if (val <= tree.threshold) return classify(tree.children['<='], row);
    else return classify(tree.children['>'], row);
  }
}

/* -------------------------
6) Execução
------------------------- */
function executarComPlanilha(caminhoArquivo) {
  const dados = lerDatasetPlanilha(caminhoArquivo);

  for (let i = dados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dados[i], dados[j]] = [dados[j], dados[i]];
  }

  const split = Math.floor(dados.length * 0.8);
  const treino = dados.slice(0, split);
  const teste = dados.slice(split);

  const atributos = Object.keys(treino[0]).filter(k => k !== 'dropout');

  const arvore = buildTree(treino, atributos, 5, 0, 8);

  let acertos = 0;
  for (const row of teste) {
    const pred = classify(arvore, row);
    if (pred === row.dropout) acertos++;
  }

  const acc = (acertos / teste.length) * 100;
  console.log(`Acurácia no conjunto de teste: ${acc.toFixed(2)}%`);
  return arvore;
}

/* -------------------------
7) Previsão de estudante
------------------------- */

function preverAluno(jsonPath, arvore) {
  const dados = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const pred = classify(arvore, dados);

  const label = pred === 0 ? 'Dropout' :
                pred === 1 ? 'Enrolled' : 'Graduate';

  let previsto;
  if(label==='Dropout'){
    previsto = 'Desistência'
  }else if(label==='Enrolled'){
    previsto = 'Matriculado'
  }else{
    previsto = 'Graduação'
  }
  console.log(`Previsão para o aluno: ${previsto}`);
}


/* -------------------------
Executar
------------------------- */

const arvore = executarComPlanilha('./data.csv');

console.log(`Para previsão de alunos, temos um modelo JSON salvo na raiz chamado de "model.json".`)
console.log(`É necessário que os dados sejam preenchidos em um arquivo JSON chamado "aluno.json" e colocados junto deste arquivo de Machine Learning.`)

console.log('\nDeseja prever um aluno com o modelo salvo? (s/n)');

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function promptLoop() {
  rl.question('Escolha (s/n): ', (answer) => {
    const resp = String(answer).trim().toLowerCase();
    if (resp === 's') {
      const alunoPath = './aluno.json';
      try {
        preverAluno(alunoPath, arvore);
        console.log()
      } catch (err) {
        console.error('Erro ao prever aluno:', err.message || err);
      }
      promptLoop();
    } else {
      console.log('Obrigado!');
      rl.close();
    }
  });
}

promptLoop();
