import { iaConfigurada } from '../ai/cliente'
import type { ModoEntrada } from '../types'
import { Aviso } from './ui'

export function EscolhaDeModo({
  aoEscolher,
  temRascunho,
  aoRetomar,
}: {
  aoEscolher: (modo: ModoEntrada) => void
  temRascunho: boolean
  aoRetomar: () => void
}) {
  const ia = iaConfigurada()

  return (
    <div className="pagina estreito">
      <h1 style={{ fontSize: 26 }}>Plano de aula da semana</h1>
      <p style={{ marginTop: 8, color: 'var(--tinta-suave)' }}>
        Preencha, revise e baixe o PDF no padrão institucional do Núcleo WIT. Sem login, sem
        Canva — o arquivo é montado aqui no seu navegador.
      </p>

      {temRascunho ? (
        <div style={{ marginTop: 20 }}>
          <Aviso tipo="info">
            Você tem um plano em andamento salvo neste navegador.{' '}
            <button type="button" className="botao discreto" onClick={aoRetomar}>
              Retomar de onde parei
            </button>
          </Aviso>
        </div>
      ) : null}

      <div className="modos">
        <button type="button" className="modo" onClick={() => aoEscolher('ia')} disabled={!ia}>
          <span className="selo">{ia ? 'Mais rápido' : 'Indisponível por enquanto'}</span>
          <h3>Colar o conteúdo e deixar a IA organizar</h3>
          <p>
            Cole o tema ou o material da aula do jeito que estiver. A IA separa em tema, objetivos,
            resumo, metodologia, blocos de 90 minutos e recursos. Você revisa tudo antes de gerar o
            PDF.
          </p>
          {!ia ? (
            <p style={{ fontSize: 12 }}>
              Falta configurar a chave de IA no Supabase e a variável <code>VITE_IA_ENDPOINT</code>.
            </p>
          ) : null}
        </button>

        <button type="button" className="modo" onClick={() => aoEscolher('manual')}>
          <span className="selo">Sempre disponível</span>
          <h3>Preencher os campos na mão</h3>
          <p>
            Você já tem o plano organizado? Vá direto para o formulário e cole cada campo no lugar.
            É a mesma tela de revisão do modo IA.
          </p>
        </button>
      </div>
    </div>
  )
}
