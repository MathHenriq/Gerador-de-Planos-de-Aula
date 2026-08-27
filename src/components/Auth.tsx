import { useState } from 'react'

import { supabase } from '../supabase/client'
import { Aviso, Campo } from './ui'

/**
 * Tela de entrada (login/cadastro). E-mail e senha, sem link mágico e sem
 * Google — decisão do instrutor, mais previsível pro professor.
 *
 * Se o Supabase não tiver as chaves configuradas (`supabase === null`), o
 * app mostra um aviso em vez de travar aqui — assim continua dando pra abrir
 * o gerador sem conta, se um dia isso voltar a ser opcional.
 */
export function Auth() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoCadastro, setAvisoCadastro] = useState('')

  if (!supabase) {
    return (
      <div className="auth">
        <Aviso tipo="erro">
          O login está indisponível no momento (faltam as chaves do Supabase configuradas).
        </Aviso>
      </div>
    )
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setAvisoCadastro('')
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase!.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      } else {
        const { data, error } = await supabase!.auth.signUp({ email, password: senha })
        if (error) throw error
        if (!data.session) {
          setAvisoCadastro('Conta criada! Confira seu e-mail para confirmar antes de entrar.')
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui entrar. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-cartao">
        <h1>Gerador de Plano de Aula</h1>
        <p className="subtitulo">Núcleo WIT · Micro Ka</p>

        <div className="auth-abas">
          <button
            type="button"
            className={modo === 'entrar' ? 'ativa' : ''}
            onClick={() => setModo('entrar')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={modo === 'cadastrar' ? 'ativa' : ''}
            onClick={() => setModo('cadastrar')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={enviar}>
          <Campo rotulo="E-mail">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Senha" dica={modo === 'cadastrar' ? 'pelo menos 6 caracteres' : undefined}>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </Campo>

          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          {avisoCadastro ? <Aviso tipo="info">{avisoCadastro}</Aviso> : null}

          <button type="submit" className="botao" disabled={carregando}>
            {carregando ? 'Um momento…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
