# machine_learning
Fatec Mauá 2025/02 - Bruno Zolotareff (Aprendizado de Máquina)

## Sobre
Projeto de uma árvore de decisão que treina dados sobre a educação do ensino superior a partir de uma planilha (`data.csv`) e permite previsões da probabilidade de graduação para um aluno a partir de um arquivo JSON (`aluno.json`).

## Pré-requisitos
- Node.js (recomendado >= 14)
- npm (ou outro gerenciador de pacotes compatível)

O projeto usa a biblioteca `xlsx` para ler planilhas Excel/CSV.

## Instalação
No diretório do projeto, instale as dependências:

```bash
npm install
```

Isso instalará `xlsx` conforme declarado em `package.json`.

## Como rodar
1. Foi utilizado os dados dessa ![Base de dados](https://archive-beta.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success
), e o mesmo encontra-se baixado junto desse projeto sob o nome de *data.csv*.

2. Execute o programa:

```bash
node machinelearning.js
```

3. O programa treinará a árvore de decisão, mostrará a acurácia no conjunto de teste e então perguntará se deseja prever um aluno salvo (`s/n`).
- Digite `s` para ler `./aluno.json`, imprimir a previsão e voltar a perguntar.
- Digite `n` para encerrar o programa.

## Observações
- Cada vez que você escolher `s`, deverá ter inserido um arquivo `aluno.json` com dados. Esse arquivo deve ter a estrutura igual ao [model.json](./model.json)

## Integrantes
Amanda Macêdo;
Flávio Máximo;
Giovanni Trimmer;
Lizandra Ferrari;
Matheus Shiomi.