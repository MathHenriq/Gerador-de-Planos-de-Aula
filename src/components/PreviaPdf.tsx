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
 * Prévia do PDF em um iframe.
 *
 * Regerar o documento a cada tecla digitada é caro, então a prévia espera o
 * professor parar de escrever por meio segundo antes de atualizar.
 */
export function PreviaPdf({ plano }: { plano: PlanoDeAula }) {
  const [url, setUrl] = useState('')
  const [erro, setErro] = useState('')
  const urlAnterior = useRef('')

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

  return <iframe title="Prévia do plano de aula" src={`${url}#toolbar=0&view=FitH`} />
}
