import { pdf } from '@react-pdf/renderer'
import { useEffect, useRef, useState } from 'react'

import { nomeDoArquivo } from '../nomeDoDocumento'
import { PlanoDocument } from '../pdf/PlanoDocument'
import { ASSETS } from '../pdf/recursos.web'
import type { PlanoDeAula } from '../types'

async function gerarBlob(plano: PlanoDeAula): Promise<Blob> {
  return pdf(<PlanoDocument plano={plano} assets={ASSETS} />).toBlob()
}

export async function baixarPdf(plano: PlanoDeAula) {
  const blob = await gerarBlob(plano)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeDoArquivo(plano)
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Dá tempo do navegador iniciar o download antes de liberar a URL.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/**
 * O navegador exibe PDF dentro da própria página?
 *
 * O Chrome do Android não exibe: no lugar do documento ele desenha um cartão
 * escuro com o identificador do blob e um botão "Abrir" — que é exatamente o
 * que os professores estavam vendo no celular. `navigator.pdfViewerEnabled` é
 * a resposta certa nos navegadores atuais (falso no Android, verdadeiro no
 * desktop). Onde a propriedade não existe, resta um palpite por tipo de
 * ponteiro e largura de tela.
 */
function suportaPdfEmbutido(): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.pdfViewerEnabled === 'boolean') return navigator.pdfViewerEnabled

  const toque = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return !(toque && window.innerWidth < 900)
}

/**
 * Prévia do PDF.
 *
 * Regerar o documento a cada tecla digitada é caro, então a prévia espera o
 * professor parar de escrever por meio segundo antes de atualizar.
 */
export function PreviaPdf({ plano }: { plano: PlanoDeAula }) {
  const [url, setUrl] = useState('')
  const [erro, setErro] = useState('')
  const urlAnterior = useRef('')
  const [embutido] = useState(suportaPdfEmbutido)

  useEffect(() => {
    let cancelado = false
    const timer = setTimeout(async () => {
      try {
        const blob = await gerarBlob(plano)
        if (cancelado) return
        const nova = URL.createObjectURL(blob)
        if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current)
        urlAnterior.current = nova
        setUrl(nova)
        setErro('')
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Falha ao montar a prévia.')
      }
    }, 500)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [plano])

  useEffect(
    () => () => {
      if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current)
    },
    [],
  )

  if (erro) return <div className="aviso erro">{erro}</div>
  if (!url) return <div className="aviso info">Montando a prévia do PDF…</div>

  if (!embutido) {
    return (
      <div className="previa-fora">
        <p>
          Seu navegador não abre PDF dentro da página — é o caso do Chrome no celular. O plano
          já está pronto: toque para abrir numa aba, ou use o botão de baixar acima.
        </p>
        <a className="botao secundario" href={url} target="_blank" rel="noopener noreferrer">
          Abrir a prévia numa aba
        </a>
      </div>
    )
  }

  // O plano sempre sai em 3 páginas fixas (ver PlanoDocument.tsx). Uma prévia
  // só com a página 1 escondia as outras duas atrás de uma rolagem que nem
  // todo visualizador de PDF embutido deixa óbvia. Em vez de um iframe só,
  // cada página ganha o seu — `#page=N` manda o visualizador nativo abrir
  // direto naquela página — empilhados na mesma coluna, todos visíveis sem
  // precisar rolar *dentro* de nada.
  return (
    <>
      {PAGINAS.map((n) => (
        <div className="previa-pagina" key={n}>
          <p className="previa-pagina-rotulo">
            Página {n} de {PAGINAS.length}
          </p>
          <iframe title={`Prévia do plano de aula — página ${n}`} src={`${url}#page=${n}&toolbar=0&view=FitH`} />
        </div>
      ))}
    </>
  )
}

const PAGINAS = [1, 2, 3]
