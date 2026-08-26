# Gerador de Plano de Aula — Núcleo WIT

Gera o plano de aula semanal do Núcleo WIT em PDF, **no padrão institucional exato**,
direto no navegador. Sem login, sem cadastro, sem Canva: link único, preenche, revisa,
baixa.

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

1. **Escolhe o modo.**
   - *Modo IA*: cola o tema ou o material bruto da aula; a IA separa em tema, objetivos,
     resumo, metodologia, blocos de tempo e recursos.
   - *Modo manual*: vai direto para o formulário.
2. **Revisa.** Os dois modos caem na mesma tela, com tudo editável e a prévia do PDF ao
   lado. A tela avisa quando falta campo, quando os blocos não fecham 90 minutos e quando
   algum texto passou do tamanho da caixa.
3. **Baixa o PDF.** Três páginas fixas, iguais ao modelo.

O rascunho fica salvo no navegador (`localStorage`), então recarregar a página não perde
o trabalho.

## Estrutura

```
src/
  pdf/            motor de geração do PDF
    layout.ts       coordenadas absolutas do template (px do design 794×1123)
    PlanoDocument.tsx  o documento em si
    ajuste.ts       encolhe a fonte quando o texto não cabe na caixa
    metricas.ts     larguras dos glifos da Poppins (GERADO)
    fontes.ts       registro das fontes (o app e o script passam caminhos diferentes)
  bncc/
    catalogo.ts     catálogo oficial da BNCC Computação
    validar.ts      validação — nada entra no plano sem estar no catálogo
  ai/cliente.ts   única porta de entrada da IA (o modo manual não passa por aqui)
  components/     interface
supabase/functions/gerar-plano/  Edge Function que fala com a API da Anthropic
scripts/          geradores e conferência de layout
```

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
ilegível) e a tela de revisão avisa quais caixas foram apertadas. O conteúdo é recortado
no limite da caixa, então **nada vaza por cima da borda** — que era exatamente o defeito
do fluxo antigo no Canva.

## BNCC

A regra herdada da skill `plano-de-aula-wit` vale aqui: **só entram códigos oficiais e
verificáveis.**

`src/bncc/catalogo.ts` traz as 141 habilidades da BNCC Computação (complemento à BNCC
homologado pela Resolução CNE/CEB nº 1, de 4 de outubro de 2022), com a descrição
oficial ao pé da letra. Todo código — digitado pelo professor ou sugerido pela IA —
passa por `validarCodigos()`:

- código que não está no catálogo é **descartado**, nunca aproveitado;
- a descrição usada no PDF é **sempre** a do catálogo, nunca a que veio de fora.

A sugestão da IA é validada duas vezes: a Edge Function só pode escolher dentro do
catálogo que recebe, e o cliente revalida a resposta.

Para ampliar (outros componentes curriculares), basta acrescentar entradas em
`catalogo.ts` copiando a descrição oficial.

## Modo IA

A IA vive inteira em uma Edge Function do Supabase — a chave da Anthropic nunca chega ao
navegador. Enquanto ela não estiver configurada, o app funciona normalmente no modo
manual e o cartão do modo IA aparece desabilitado.

Para ligar:

```bash
# 1. no projeto Supabase
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy gerar-plano

# 2. no .env do front-end (copie de .env.example)
VITE_IA_ENDPOINT=https://SEU-PROJETO.supabase.co/functions/v1/gerar-plano
VITE_SUPABASE_ANON_KEY=...
```

A function expõe duas ações: `extrair` (texto bruto → campos do plano) e `bncc`
(sugestão de habilidades dentro do catálogo enviado).

## Deploy

Projeto Vite estático — qualquer host serve. Na Vercel, os padrões já funcionam
(`npm run build`, saída em `dist`); `vercel.json` só acrescenta o fallback de SPA e o
cache dos assets. As variáveis `VITE_*` precisam estar definidas no painel do host no
momento do build.

## Pendências

- [ ] Confirmar com o instrutor o nome exato da fonte do template (hoje: Poppins).
- [ ] Configurar a chave da Anthropic no Supabase para ligar o modo IA.
- [ ] Confirmar se o campo **Curso** é sempre "IA" ou se varia.
