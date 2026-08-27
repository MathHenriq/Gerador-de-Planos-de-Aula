# Gerador de Plano de Aula — Núcleo WIT

Gera o plano de aula semanal do Núcleo WIT em PDF, **no padrão institucional exato**,
direto no navegador. Sem login, sem cadastro, sem Canva: link único, o professor preenche
o formulário e baixa o arquivo.

O layout não é uma reinterpretação do modelo — as coordenadas foram lidas dos PDFs de
produção (semanas 27/07 e 31/08) e o resultado é conferido contra eles a cada
mudança. Ver [Fidelidade do layout](#fidelidade-do-layout).

## Como rodar

```bash
npm install
npm run dev       # http://localhost:5173
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run amostra` | Gera `amostras/plano.pdf` fora do navegador, para conferir o layout |
| `npm run metricas` | Regera `src/pdf/metricas.ts` a partir dos arquivos da fonte |

## Como o professor usa

Uma tela só: preenche os campos à esquerda, confere a prévia do PDF à direita, baixa.

**No celular** o Chrome do Android não exibe PDF dentro da página — no lugar do documento
ele desenha um cartão escuro com o identificador do blob. Quando
`navigator.pdfViewerEnabled` é falso, a prévia embutida dá lugar a um cartão com o botão
"Abrir a prévia numa aba"; o download continua funcionando normalmente.

A tela avisa quando falta campo obrigatório, quando os blocos da atividade não fecham os
90 minutos e quando algum texto passou do tamanho da caixa do template.

O rascunho fica salvo no navegador (`localStorage`), então recarregar a página não perde
o trabalho — quem sai e volta encontra os campos exatamente como deixou, editáveis
normalmente. Isso já foi confundido com "o link travou no exemplo" (era um bug real, e foi
corrigido — ver `App.tsx`); se acontecer de novo, ou se o rascunho salvo for de outra
pessoa, o botão **"Limpar página"** no cabeçalho — visível assim que a página abre, sem
precisar rolar — reseta tudo (pede confirmação, porque apaga o que estiver preenchido). O
mesmo botão também existe no rodapé do formulário, para quem já chegou até o fim.

## Valores fixos

Ficam todos em [`src/constants.ts`](src/constants.ts) — é o único arquivo a mexer quando
a lista mudar.

- **Núcleos** (18): o professor marca quais a aula alcança, **na ordem da semana** — o
  primeiro marcado é o de segunda-feira, o segundo é o de terça, e assim por diante. A
  seleção guarda a ordem de clique e é essa ordem que sai no PDF; quem clicar fora de
  ordem corrige pelas setas, sem desmarcar tudo.
- **Cursos** (6): Oficina de Games, Inteligência Artificial, Comunicação Digital,
  Metaverso, Ambientes Inteligentes, Integral.
- **Ciclos** (`CICLOS`): Trainee, Júnior e Sênior — a trilha do Núcleo WIT — mais 1º a 9º
  ano, para as turmas do Integral, que se organizam por ano escolar em vez de trilha.
  Campo é um `<select>` fechado (era texto livre com sugestões antes; virou lista fixa
  porque nem todo navegador mostra as sugestões de um `<datalist>` de forma confiável).
- **Duração**: 90 ou 100 minutos, escolha do professor no cabeçalho
  (`DURACOES_DISPONIVEIS`). É o mesmo número que a Estrutura da Atividade tem que fechar —
  trocar a duração não redistribui os blocos automaticamente, então o aviso de "faltam N
  min" aparece até o professor ajustar. Para adicionar uma terceira opção, é só acrescentar
  o número à lista.

## Nome do arquivo

Todo documento sai com o nome padronizado do Núcleo WIT:

```
Plano de aula Núcleo WIT - Nome Sobrenome - data
Plano de aula Núcleo WIT - Matheus Henrique - 31.08 - 04.09.pdf
```

Regras, em [`src/nomeDoDocumento.ts`](src/nomeDoDocumento.ts):

- **Nome**: primeiro nome + primeiro sobrenome, tirados do campo *Prof.*. Partículas são
  puladas ("Ana de Souza Lima" → "Ana Souza"). A função só encurta: quem digitar
  "Matheus H." recebe "Matheus H.", porque não há como adivinhar o nome completo.
- **Data**: o campo *Semana*, com as barras trocadas por ponto. O padrão escrito usa
  "31/08 - 04/09", mas barra é caractere proibido em nome de arquivo no Windows, no macOS
  e no Linux — o ponto mantém a forma sem quebrar o download. Dentro do PDF, o cabeçalho
  continua mostrando a semana exatamente como foi digitada.
- Campo vazio é omitido, e o nome se fecha com as partes que existirem.

O mesmo nome vai nos metadados do PDF (o título que o leitor mostra), e a tela exibe o
nome final ao lado do botão de baixar.

## Estrutura

```
src/
  pdf/            motor de geração do PDF
    layout.ts       coordenadas absolutas do template (px do design 794×1123)
    PlanoDocument.tsx  o documento em si
    ajuste.ts       encolhe a fonte quando o texto não cabe na caixa
    diagnostico.ts  quais caixas encolheram e quais vão sair cortadas
    metricas.ts     larguras dos glifos da Poppins (GERADO)
    fontes.ts       registro das fontes (o app e o script passam caminhos diferentes)
  bncc/
    validar.ts      única regra automática: o código da habilidade tem que começar com "EF"
  components/     interface
  constants.ts    núcleos, cursos, duração
  nomeDoDocumento.ts  nome padronizado do arquivo e do título do PDF
scripts/          geradores e conferência de layout
```

### Ordem das seções

Página 1 — Cabeçalho, Escolas, Tema da aula, Resumo da aula, Materiais necessários,
Objetivos de aprendizagem, Habilidades da aula.
Página 2 — Metodologia, Estrutura da atividade.
Página 3 — Recursos necessários, Observação.

Essa é a ordem do PDF de referência mais recente do Núcleo WIT — note que difere da
versão anterior deste gerador (que tinha Resumo e Estrutura numa página à parte). O campo
**Observação**, no fim da página 3, é o único que não existe nesse PDF de referência: foi
acrescentado a pedido, com o mesmo estilo de caixa das demais seções, ocupando o espaço que
sobrou depois de encolher a caixa de Recursos.

## Fidelidade do layout

`src/pdf/layout.ts` guarda todas as coordenadas em pixels do design original
(794 × 1123, proporção A4), convertidas para pontos por `pt()` — 1 px = 0,75 pt.

Para conferir depois de mexer no layout:

```bash
npm run amostra
```

Isso gera `amostras/plano.pdf` com o conteúdo real da semana 31/08–04/09. Comparado com
o PDF exportado do Canva, o desvio máximo de posição é de **2,2 px de design** — e esses
2,2 px estão nas caixas do cabeçalho, onde o próprio template do Canva é inconsistente
(cada caixa tem um recuo diferente). Todo o resto — molduras, rótulos, listas, blocos —
bate exatamente.

Duas diferenças conhecidas e aceitas:

- **Fonte.** O original usa a *Now* (do Canva, não distribuída livremente). Usamos
  **Poppins**, a aproximação combinada com o instrutor. Como a Poppins é um pouco mais
  estreita, a quebra de linha dentro de um parágrafo pode cair em palavra diferente.
  Trocar é questão de substituir os arquivos em `src/assets/fonts` e rodar
  `npm run metricas`.
- **Bordas.** Desenhadas com 1,44 pt, medido a 300 dpi no arquivo de referência.

Os dois logos (Micro Ka e a marca-d'água Núcleo WIT) foram extraídos dos próprios PDFs de
produção, com o canal de transparência preservado — não são placeholders.

### Texto que não cabe

As caixas do template têm altura fixa. Quando o professor escreve mais do que cabe, o
gerador reduz o corpo da fonte até caber (até o limite de 62% — abaixo disso fica
ilegível) e a tela avisa quais caixas foram apertadas. O conteúdo é recortado no limite
da caixa, então **nada vaza por cima da borda** — que era exatamente o defeito do fluxo
antigo no Canva.

Quando nem o menor corpo dá conta, o aviso muda de tom: o texto vai sair cortado e
precisa ser encurtado. É o que acontece na caixa "Escolas:" a partir de 14 núcleos
marcados — o seletor avisa na hora da marcação, sem esperar o PDF.

## BNCC

**Campo livre — o professor digita o código e a descrição, à mão.**

Não há mais catálogo embutido nem sugestão de descrição. A única regra automática, em
[`src/bncc/validar.ts`](src/bncc/validar.ts), é que o código comece com **"EF"** (Ensino
Fundamental) — `EM13CO10` ou `EI03CO01`, por exemplo, são recusados. Fora essa checagem, o
texto que sai no PDF é exatamente o que foi digitado: nenhuma descrição é reescrita,
completada ou comparada contra fonte nenhuma.

Essa mudança existe porque a versão anterior tinha um catálogo embutido cuja procedência
não era o anexo oficial do MEC (checamos e havia divergências reais entre fontes, além de
uma divisão por "competência 5 e 6" que era leitura própria, não classificação oficial).
Diante do risco de o documento sair com texto divergente da BNCC, a decisão foi tirar
qualquer afirmação de autoridade do gerador e deixar a conferência com quem preenche.

Se um catálogo oficial (confirmado contra o anexo do MEC) entrar no escopo de novo, o
lugar natural para ele é um arquivo novo em `src/bncc/`, com a mesma função de validação
trocada por uma que compare contra esse catálogo — sem mexer no resto do formulário.

## Deploy

Projeto Vite estático — qualquer host serve, sem back-end e sem variáveis de ambiente. Na
Vercel, os padrões já funcionam (`npm run build`, saída em `dist`); `vercel.json` só
acrescenta o fallback de SPA e o cache dos assets.

## Pendências

- [ ] Confirmar com o instrutor o nome exato da fonte do template (hoje: Poppins).
