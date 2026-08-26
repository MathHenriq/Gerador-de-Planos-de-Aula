import { DURACAO_PADRAO } from './constants'
import type { PlanoDeAula } from './types'

/**
 * Reprodução do plano real da semana 31/08–04/09, usado como:
 *  - amostra para conferir a fidelidade do PDF contra o arquivo do Canva;
 *  - exemplo carregável na interface ("preencher com exemplo").
 */
export const planoDeAmostra: PlanoDeAula = {
  curso: 'IA',
  ciclo: 'Sênior',
  semana: '31/08 - 04/09',
  conteudo: 'Criação do Front-End do projeto',
  professor: 'Matheus H.',
  duracao: DURACAO_PADRAO,

  temaDaAula: 'Produção do projeto',

  objetivos: [
    'Compreender os conceitos básicos de front-end e o papel do HTML, CSS e JavaScript na construção de uma página web.',
    'Estruturar a primeira versão do front-end do projeto final, aplicando HTML para conteúdo e CSS para estilização.',
    'Iniciar a implementação de interatividade com JavaScript, relacionando o front-end às funcionalidades planejadas para o projeto.',
  ],

  habilidades: [
    {
      codigo: 'EF69CO02',
      descricao:
        'Elaborar algoritmos que envolvam instruções sequenciais, de repetição e de seleção usando uma linguagem de programação.',
    },
    {
      codigo: 'EF69CO03',
      descricao:
        'Descrever com precisão a solução de um problema, construindo o programa que implementa a solução descrita.',
    },
  ],

  materiais: ['Computador', 'Mouse e teclado', 'Acesso à internet'],

  metodologia: [
    'Apresentação expositiva e dialogada dos conceitos básicos de front-end, explicando o papel do HTML (estrutura), CSS (estilização) e JavaScript (interatividade).',
    'Demonstração prática pelo professor, criando um exemplo simples de página com os três elementos integrados.',
    'Desenvolvimento guiado, em que os alunos iniciam a construção do front-end do próprio projeto final, aplicando HTML e CSS para estruturar e estilizar a página.',
  ],

  resumo:
    'Aula introdutória sobre desenvolvimento front-end, abordando os conceitos básicos de HTML, CSS e JavaScript. Os alunos compreendem o papel de cada linguagem na construção de uma página web e iniciam a produção do front-end do projeto final do curso, estruturando o conteúdo em HTML, aplicando estilização em CSS e dando os primeiros passos em interatividade com JavaScript.',

  estrutura: [
    {
      titulo: 'Conversa inicial e organização da aula',
      minutos: 10,
      itens: [
        'Acomodação dos alunos na sala.',
        'Login nas contas e organização das equipes.',
        'Apresentação dos objetivos da aula.',
      ],
    },
    {
      titulo: 'Dinâmica quebra-gelo - Globe',
      minutos: 25,
      itens: [
        'Os alunos tentam adivinhar um país; a cada palpite errado, o mapa mostra a proximidade geográfica até o país correto (colorindo o globo).',
      ],
    },
    {
      titulo: 'Introdução teórica ao front-end',
      minutos: 15,
      itens: [
        'Explicação dos conceitos de HTML, CSS e JS e o papel de cada um na construção de uma página web.',
        'Demonstração prática de um exemplo simples pelo professor.',
      ],
    },
    {
      titulo: 'Desenvolvimento do front-end do projeto',
      minutos: 30,
      itens: [
        'Estruturação do conteúdo em HTML.',
        'Estilização da página com CSS.',
        'Primeiros comandos de interatividade em JavaScript.',
        'Acompanhamento e orientações do professor às equipes.',
      ],
    },
    {
      titulo: 'Finalização da aula',
      minutos: 10,
      itens: [
        'Compartilhamento rápido do progresso entre as equipes.',
        'Reflexão sobre as dificuldades encontradas e próximos passos.',
        'Organização da sala e encerramento.',
      ],
    },
  ],

  recursos: ['Canva', 'Globe', 'VSCode'],
}
