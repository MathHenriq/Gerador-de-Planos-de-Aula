import { Font } from '@react-pdf/renderer'

/**
 * O design original usa a fonte "Now" (não distribuída livremente).
 * Poppins é a aproximação combinada com o instrutor: mesma família geométrica,
 * mesmas proporções de caixa alta. Trocar aqui quando a fonte oficial chegar.
 */
export const FAMILIA = 'Poppins'

export interface ArquivosDeFonte {
  regular: string
  medium: string
  semibold: string
  bold: string
}

let registrado = false

export function registrarFontes(arquivos: ArquivosDeFonte) {
  if (registrado) return
  registrado = true

  Font.register({
    family: FAMILIA,
    fonts: [
      { src: arquivos.regular, fontWeight: 400 },
      { src: arquivos.medium, fontWeight: 500 },
      { src: arquivos.semibold, fontWeight: 600 },
      { src: arquivos.bold, fontWeight: 700 },
    ],
  })

  // O template do Canva não hifeniza: as palavras quebram inteiras.
  Font.registerHyphenationCallback((palavra) => [palavra])
}
