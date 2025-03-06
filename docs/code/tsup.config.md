---
title: tsup.config.js
description: Configuração do tsup para empacotar o projeto TypeScript em módulos ESM, com otimização e mapas de origem.
---

# Configuração do Tsun

Este arquivo (`tsup.config.js`) fornece a configuração para o Tsun, um empacotador rápido e minimalista para projetos TypeScript. A seguir estão os detalhes da configuração atual:

## Detalhes da Configuração

- **entryPoints**: 
  - `["src/index.ts"]`
    - Define o ponto de entrada para o processo de construção do Tsun, especificando que a compilação começará no arquivo `src/index.ts`.

- **format**:
  - `["esm"]`
    - Especifica que os módulos devem ser embalados como ECMAScript Modules (ESM), compatíveis com o padrão moderno de módulos em JavaScript.

- **outDir**:
  - `"dist"`
    - Define o diretório onde os arquivos compilados e empacotados serão colocados, neste caso, no diretório `dist`.

- **minify**:
  - `true`
    - Ativa a minificação dos arquivos de saída para reduzir o tamanho do código, melhorando o desempenho das aplicações que os utilizam.

- **sourcemap**:
  - `true`
    - Gera mapas de origem (source maps) junto com os arquivos compilados. Isso facilita a depuração ao mapear os códigos minificados ou transpilados de volta aos seus equivalentes em código-fonte original.

Esta configuração é ideal para projetos que buscam uma construção eficiente e otimizada, garantindo que os arquivos finais sejam menores e mais rápidos para serem carregados no navegador, enquanto ainda oferece ferramentas úteis para desenvolvimento e depuração.