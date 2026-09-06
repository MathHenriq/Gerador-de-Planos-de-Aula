# Gerador de Plano de Aula — Núcleo WIT

Gera o plano de aula semanal do Núcleo WIT em PDF, **no padrão institucional exato**,
direto no navegador. Sem Canva: o professor entra com e-mail e senha, preenche o
formulário e baixa o arquivo — e pode salvar o plano na própria conta para editar depois.

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
| `npm run importacao` | Gera o PDF de amostra e lê de volta, conferindo campo a campo |
| `npm run metricas` | Regera `src/pdf/metricas.ts` a partir dos arquivos da fonte |

## Como o professor usa

Uma tela só: preenche os campos à esquerda, confere a prévia do PDF à direita, baixa. A
prévia mostra as 3 páginas do plano empilhadas, cada uma em seu próprio visualizador
(`#page=N` no fragmento da URL do blob) — dá pra ver o documento inteiro rolando a tela,
sem precisar baixar primeiro.

**No celular** o Chrome do Android não exibe PDF dentro da página — no lugar do documento
ele desenha um cartão escuro com o identificador do blob. Quando
`navigator.pdfViewerEnabled` é falso, a prévia embutida dá lugar a um cartão com o botão
"Abrir a prévia numa aba"; o download continua funcionando normalmente.

A tela avisa quando falta campo obrigatório, quando os blocos da atividade não fecham os
90 minutos e quando algum texto passou do tamanho da caixa do template.

Toda lista do formulário — objetivos, materiais, metodologia, recursos, habilidades da
BNCC, blocos da estrutura e os passos dentro de cada bloco — tem **setas ↑ ↓ para
reordenar**, além do × de remover, como já havia na seleção de escolas. Quem acrescentou um
item no fim, ou errou a ordem, move em vez de reescrever tudo. As habilidades da BNCC
continuam **editáveis depois de adicionadas** (código e descrição), em vez de virarem
texto fixo. As caixas de texto crescem conforme o conteúdo, para item longo não ficar com
o fim escondido.

O rascunho do que está sendo editado fica salvo no navegador (`localStorage`, isolado por
professor — ver [Login e planos salvos](#login-e-planos-salvos)), então recarregar a página
não perde o trabalho — quem sai e volta encontra os campos exatamente como deixou,
editáveis normalmente. Isso já foi confundido com "o link travou no exemplo" (era um bug
real, e foi corrigido — ver `App.tsx`); se acontecer de novo, o botão **"Limpar página"** no
cabeçalho — visível assim que a página abre, sem precisar rolar — reseta tudo (pede
confirmação, porque apaga o que estiver preenchido). O mesmo botão também existe no rodapé
do formulário, para quem já chegou até o fim.

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

## Login e planos salvos

O gerador usa [Supabase](https://supabase.com) só para login e para guardar os planos
salvos — a geração do PDF continua 100% no navegador, sem servidor nenhum no meio.

- **Login**: e-mail e senha (`supabase.auth`). Não tem link mágico nem Google — decisão
  do instrutor, mais previsível pro professor. A confirmação de e-mail no primeiro
  cadastro está **desligada** (Authentication → Providers → Email → "Confirm email", no
  painel do projeto) — quem se cadastra já entra na hora, sem precisar clicar em link
  nenhum.
- **Esqueci minha senha**: link na tela de login (`src/components/Auth.tsx`) chama
  `resetPasswordForEmail`, que manda um e-mail com um link de recuperação. Ao abrir esse
  link, o Supabase já loga a pessoa numa sessão temporária e dispara o evento
  `PASSWORD_RECOVERY`; `App.tsx` escuta esse evento e troca a tela normal pela de "Nova
  senha" (`src/components/RedefinirSenha.tsx`) até a pessoa escolher a senha nova — depois
  disso cai direto no formulário, já logada. Pra esse link funcionar em produção (e não só
  em `localhost`), o domínio do site precisa estar na lista de **Redirect URLs**, em
  Authentication → URL Configuration, no painel do projeto.
- **Planos salvos**: tabela `planos` (`professor_id`, `dados` — o `PlanoDeAula` inteiro
  como JSON —, `criado_em`, `atualizado_em`), com RLS restringindo cada professor às
  próprias linhas. O botão **"Salvar na minha conta"**, ao lado de "Baixar PDF", grava o
  plano em edição; se ele veio de "Meus planos", o botão vira "Atualizar plano salvo" e
  sobrescreve a mesma linha em vez de criar outra. O botão **"Meus planos"**, no cabeçalho,
  lista os planos salvos (mais recente primeiro) para abrir ou excluir.
- **Variáveis de ambiente**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ver
  `.env.example`) — a "anon/publishable key" não é secreta, foi feita para ir no código do
  site; quem protege os dados é a regra de RLS no banco, não o segredo da chave. Sem essas
  variáveis configuradas, `src/supabase/client.ts` fica `null` e a tela de login mostra um
  aviso em vez de travar.
- **Onde mexer**: `src/supabase/client.ts` (o cliente), `src/supabase/planos.ts` (as
  funções de salvar/listar/excluir/compartilhar/copiar), `src/supabase/equipes.ts` (perfil,
  equipes e as funções da Gestão), `src/components/Auth.tsx` (login/cadastro/"esqueci
  minha senha"), `src/components/RedefinirSenha.tsx` (escolher a senha nova),
  `src/components/MeusPlanos.tsx` (a lista de planos salvos). O esquema das equipes está
  em [`supabase/migrations`](supabase/migrations); o da tabela `planos` original foi
  aplicado à mão no painel, antes deste arquivo existir.

## Equipes e planos compartilhados

O problema que isso resolve: dois professores do mesmo curso davam a mesma aula, e o
segundo copiava o plano do primeiro **campo por campo**, a partir do PDF.

- **Equipes**: uma por curso (Oficina de Games, Inteligência Artificial, Comunicação
  Digital, Metaverso, Ambientes Inteligentes, Integral) mais a **Gestão**. Um professor
  pode estar em mais de uma — quem dá aula no Integral e num curso está nas duas, e vê os
  planos das duas. A lista fica em `EQUIPES`, em [`src/constants.ts`](src/constants.ts), e
  espelha a tabela `equipes` do banco: mexeu num lado, mexa no outro.
- **No cadastro** o professor responde *"Qual equipe você faz parte?"* (e o nome e
  sobrenome, que é o que sai no campo *Prof.*). Isso vai como metadado do usuário, e uma
  trigger no banco (`ao_criar_usuario`) cria o perfil e os vínculos — ninguém entra sem
  equipe, e ninguém se coloca na Gestão sozinho (a trigger descarta `gestao` do metadado,
  que é escrito pelo próprio usuário).
- **Compartilhar**: ao salvar, o professor escolhe entre *"Manter somente para mim"* e
  *"Compartilhar com a equipe X"* — só entre as equipes dele. Dá para mudar depois, na
  lista de "Meus planos".
- **Copiar**: em **"Planos da equipe"**, o colega abre um plano compartilhado (aparece
  "Compartilhado por Fulano") e clica em **"Fazer uma cópia para mim"**. A cópia entra na
  conta dele com todo o conteúdo do original, trocando só o *Prof.* pelo nome dele e os
  núcleos pelos que ele costuma atender (`perfis.escolas_padrao`, que se atualiza a cada
  cópia). A cópia nasce privada, e o original do autor não é tocado.
- **Gestão**: equipe à parte, com um botão próprio no cabeçalho. Vê todos os professores e
  move qualquer um de equipe pela tela, e enxerga todos os planos — inclusive os não
  compartilhados —, mas **só de leitura**: não edita nem exclui plano de professor.
- **Quem garante isso é o banco, não a tela.** As políticas de RLS
  (`supabase/migrations/20260906_equipes.sql`) decidem quem lê e escreve o quê; os botões
  que somem são só conveniência. Um professor não consegue, nem chamando a API direto,
  ler plano privado de outro, compartilhar com equipe de que não faz parte, editar plano
  alheio, se promover à Gestão ou remexer nas equipes dos outros.

### Exportação em lote (Gestão)

Na aba **Exportar** do painel da Gestão: escolhe a semana (a lista sai do campo *Semana*
dos planos salvos), escolhe como as pastas ficam organizadas e baixa um ZIP com o PDF de
cada plano — gerados aqui no navegador, com o mesmo motor do botão "Baixar PDF", então o
arquivo é idêntico ao que o professor baixaria.

Três organizações possíveis (`src/exportar/pacote.ts`):

| Opção | Estrutura |
|---|---|
| Só por curso | `Oficina de Games/plano.pdf` |
| Por curso e, dentro dele, por professor | `Oficina de Games/Nicolas Correa/plano.pdf` |
| Só por professor | `Nicolas Correa/plano.pdf` |

Detalhes que valem saber:

- As **seis pastas de curso aparecem sempre** (nas duas primeiras opções); a que não teve
  plano na semana leva um `(sem planos).txt` dentro, para a Gestão ver de relance quem não
  entregou.
- Um plano **não compartilhado** entra pelo campo *Curso* dele, já que não tem equipe. Um
  checkbox deixa excluir esses planos da exportação.
- Dois planos do mesmo professor na mesma semana têm o mesmo nome padrão de arquivo; o
  segundo ganha o tema no fim do nome, para nenhum sobrescrever o outro dentro do ZIP.

## Importar um plano de PDF

O botão **"Importar PDF"**, no cabeçalho, lê um plano de aula a partir do PDF e joga os
campos no formulário — resolvendo o retrabalho de recopiar plano vindo de outro sistema.

A leitura é **posicional, não por palavra-chave**: o template tem as caixas sempre nas
mesmas coordenadas (`src/pdf/layout.ts`), então o que decide de qual campo é cada trecho
é o lugar dele na página. Duas coisas que o texto sozinho não resolve:

- **Onde um item de lista termina.** O marcador é um círculo desenhado, não texto, e todas
  as linhas de um item (inclusive as de continuação) começam no mesmo x. O leitor acha as
  bolinhas na lista de operações de desenho do PDF e usa a posição delas. Se não achar
  nenhuma (PDF de outra origem), cai num plano B: se a primeira palavra da linha seguinte
  ainda caberia no que sobrou da linha atual, então aquilo é item novo, não continuação.
- **Título x item, na Estrutura da atividade.** Os dois saem em caixa alta; o que separa é
  o recuo (11,1 px do título contra 36 dos itens).

**Limitação conhecida e sem solução possível:** o template imprime quase tudo em caixa
alta, então o texto importado volta em MAIÚSCULAS — o PDF não guarda em lugar nenhum como
o professor tinha digitado. O conteúdo está correto; só a caixa das letras muda. A tela
avisa isso antes de usar o plano, e o que é importado **não é salvo sozinho**: cai no
formulário como plano novo, para conferir e salvar.

Para conferir o leitor depois de mexer no layout ou no documento:

```bash
npm run importacao
```

Gera o PDF do plano de amostra, lê de volta e compara campo a campo com o original
(ignorando maiúsculas/minúsculas, pelo motivo acima). Sai com erro se algum campo divergir.

### Aplicar no Supabase

O SQL está em [`supabase/migrations/20260906_equipes.sql`](supabase/migrations/20260906_equipes.sql):
cole o arquivo inteiro no **SQL Editor** do projeto e rode uma vez. Ele cria as tabelas
(`equipes`, `perfis`, `membros_equipe`), as colunas novas de `planos`, a visão
`planos_visao`, as políticas de RLS, a trigger de cadastro — e já faz a carga inicial:
perfil de todo mundo (com o nome tirado do último plano salvo), as escolas habituais e as
equipes de cada professor conforme a lista da coordenação.

É idempotente, mas a carga inicial de equipes é **de partida**: rodar de novo depois de a
Gestão ter remanejado alguém recoloca a pessoa na equipe original. Depois da primeira
execução, use a tela da Gestão.

Para acrescentar alguém à Gestão (o rodapé do arquivo tem o mesmo trecho):

```sql
insert into public.membros_equipe (professor_id, equipe_id)
select id, 'gestao' from auth.users where lower(email) = lower('fulano@exemplo.com')
on conflict do nothing;
```

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
  importar/
    linhas.ts       texto e marcadores do PDF, em px do design
    plano.ts        de que campo é cada trecho, pela caixa em que ele caiu
  exportar/
    pacote.ts       o ZIP da Gestão: pastas por curso e/ou professor
  supabase/
    client.ts       cliente do Supabase (login + banco)
    planos.ts       salvar/listar/excluir/compartilhar/copiar planos
    equipes.ts      perfil do professor, equipes dele e as funções da Gestão
  components/     interface (inclui Auth.tsx, MeusPlanos.tsx, PlanosDaEquipe.tsx,
                  Gestao.tsx)
  constants.ts    núcleos, cursos, equipes, ciclos, duração
supabase/
  migrations/     o esquema das equipes, para rodar no SQL Editor
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

Projeto Vite estático — qualquer host serve, sem back-end próprio (o Supabase é hospedado
à parte). Na Vercel, os padrões já funcionam (`npm run build`, saída em `dist`);
`vercel.json` só acrescenta o fallback de SPA e o cache dos assets. É preciso configurar
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto na
Vercel (Settings → Environment Variables) — sem elas, o build sai sem login funcionando.

## Pendências

- [ ] Confirmar com o instrutor o nome exato da fonte do template (hoje: Poppins).
- [ ] Decidir se a confirmação por e-mail do Supabase fica ligada ou não (ver
      [Login e planos salvos](#login-e-planos-salvos)).
