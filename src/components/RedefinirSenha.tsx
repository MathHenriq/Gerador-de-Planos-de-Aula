import { useState } from 'react'

import { supabase } from '../supabase/client'
import { Aviso, Campo } from './ui'

/**
 * Tela de "escolher senha nova", depois de clicar no link que "Esqueci
 * minha senha" manda por e-mail.
 *
 * O Supabase, ao abrir esse link, já loga a pessoa numa sessão temporária de
 * recuperação e dispara o evento `PASSWORD_RECOVERY` — é `App.tsx` que troca
 * a tela normal por esta aqui quando vê esse evento (ver `onAuthStateChange`).
 */
export function RedefinirSenha({ aoConcluir }: { aoConcluir: () => void }) {
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  if (!supabase) return null

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const { error } = await supabase!.auth.updateUser({ password: senha })
      if (error) throw error
      aoConcluir()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui trocar a senha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-cartao">
        <h1>Nova senha</h1>
        <p className="subtitulo">Escolha a senha que vai usar daqui pra frente.</p>

        <form onSubmit={salvar}>
          <Campo rotulo="Nova senha" dica="pelo menos 6 caracteres">
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </Campo>

          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

          <button type="submit" className="botao" disabled={carregando}>
            {carregando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
