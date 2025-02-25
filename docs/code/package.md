---
title: package.json
description: Documentação do arquivo `package.json` do projeto `codocx`, detalhando configurações e dependências.
---

# Configuração do Projeto Codocx

O arquivo `package.json` desempenha um papel crucial no gerenciamento de dependências e scripts para o projeto `codocx`. Abaixo está a documentação das principais seções encontradas neste arquivo:

## Informações Básicas

- **Nome**: `codocx`
- **Versão**: `1.0.5`
- **Licença**: `MIT`
- **Tipo de Módulo**: `module`

O tipo "module" indica que o projeto utiliza módulos ES6.

## Ponto de Entrada e Binários

- **Main**: 
  - Caminho: `./dist/index.js`
  
- **Binários**:
  - Nome do comando: `codocx`
  - Caminho executável: `./dist/index.js`

O binário é a forma como o projeto pode ser executado via linha de comando.

## Scripts

Os scripts facilitam operações comuns durante o desenvolvimento e deploy:

- **start**: 
  - Executa o arquivo principal do projeto em modo ESM usando Node.js.
  - Comando: `ts-node --esm src/index.ts`

- **clean**: 
  - Remove as pastas de distribuição (`dist`) e execução temporária (`exec`).
  - Utiliza a ferramenta `rimraf`.

- **build**: 
  - Limpa e compila o projeto usando `tsup`.
  - Comando: `npm run clean && tsup`

- **pub**:
  - Realiza a construção do projeto, incrementa a versão (`patch`) e publica no npm.
  - Comando: `npm run build && npm version patch && npm publish`

- **refresh**:
  - Remove as dependências instaladas e o arquivo de bloqueio de pacotes, após isso instala tudo novamente.
  - Comando: `rm -rf ./node_modules ./package-lock.json && npm install`

## Dependências

O projeto utiliza diversas bibliotecas para funcionalidades específicas:

- **@clack/prompts**: 
  - Versão: `^0.7.0`
  
- **chalk**:
  - Versão: `^5.3.0`
  - Utilizada para colorir o texto no console.

- **commander**:
  - Versão: `^12.1.0`
  - Facilita a construção de interfaces de linha de comando.

- **dotenv**:
  - Versão: `^16.4.5`
  - Lida com variáveis ambientais para diferentes ambientes.

- **zod**:
  - Versão: `^3.23.8`
  - Ferramenta para validação de dados baseada em esquemas.

## Dependências de Desenvolvimento

Estas bibliotecas são utilizadas durante o desenvolvimento e não fazem parte da aplicação final:

- **@types/node**:
  - Versão: `^20.14.9`
  
- **rimraf**:
  - Versão: `^6.0.1`
  - Biblioteca para remoção de pastas recursivamente.

- **ts-node**:
  - Versão: `^10.9.2`
  - Executa arquivos TypeScript diretamente com Node.js.

- **tsup**:
  - Versão: `^8.1.0`
  - Ferramenta para transpilar e embalar código TypeScript.

- **typescript**:
  - Versão: `^5.5.3`
  - Compilador de código TypeScript.

Com essas configurações, o projeto `codocx` é estruturado para facilitar o desenvolvimento e a distribuição eficaz do mesmo.