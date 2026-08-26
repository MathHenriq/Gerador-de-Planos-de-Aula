/**
 * Amarração dos arquivos estáticos (fontes e logos) ao gerador de PDF,
 * do jeito que o Vite entende. O script de amostra em Node usa caminhos
 * de arquivo no lugar destas URLs — por isso o documento recebe os
 * `assets` por props em vez de importá-los direto.
 */
import poppinsRegular from '../assets/fonts/Poppins-Regular.ttf?url'
import poppinsMedium from '../assets/fonts/Poppins-Medium.ttf?url'
import poppinsSemiBold from '../assets/fonts/Poppins-SemiBold.ttf?url'
import poppinsBold from '../assets/fonts/Poppins-Bold.ttf?url'
import logoMicroKa from '../assets/logo-micro-ka.png'
import marcaWit from '../assets/marca-nucleo-wit.png'

import { registrarFontes } from './fontes'
import type { AssetsDoPlano } from './PlanoDocument'

registrarFontes({
  regular: poppinsRegular,
  medium: poppinsMedium,
  semibold: poppinsSemiBold,
  bold: poppinsBold,
})

export const ASSETS: AssetsDoPlano = { logoMicroKa, marcaWit }
