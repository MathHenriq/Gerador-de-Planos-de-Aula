import { useState } from 'react'

import { supabase } from '../supabase/client'
import { Aviso, Campo } from './ui'

type Modo = 'entrar' | 'cadastrar' | 'recuperar'

/**
 * Tela de entrada (login/cadastro/recuperação). E-mail e senha, sem link
 * mágico e sem Google — decisão do instrutor, mais previsível pro professor.
 *
 * Se o Supabase não tiver as chaves configuradas (`supabase === null`), o
 * app mostra um aviso em vez de travar aqui — assim continua dando pra abrir
 * o gerador sem conta, se um dia isso voltar a ser opcional.
 */
export function Auth() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

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
    setAviso('')
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase!.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      } else if (modo === 'cadastrar') {
        const { data, error } = await supabase!.auth.signUp({ email, password: senha })
        if (error) throw error
        if (!data.session) {
          setAviso('Conta criada! Confira seu e-mail para confirmar antes de entrar.')
        }
      } else {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setAviso('Te mandamos um e-mail com um link para escolher uma senha nova.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui completar. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  const titulo = { entrar: 'Entrar', cadastrar: 'Criar conta', recuperar: 'Redefinir senha' }[modo]

  return (
    <div className="auth">
      <div className="auth-cartao">
        <h1>Gerador de Plano de Aula</h1>
        <p className="subtitulo">Núcleo WIT · Micro Ka</p>

        {modo !== 'recuperar' ? (
          <div className="auth-abas">
            <button
              type="button"
              className={modo === 'entrar' ? 'ativa' : ''}
              onClick={() => {
                setModo('entrar')
                setErro('')
                setAviso('')
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={modo === 'cadastrar' ? 'ativa' : ''}
              onClick={() => {
                setModo('cadastrar')
                setErro('')
                setAviso('')
              }}
            >
              Criar conta
            </button>
          </div>
        ) : null}

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

          {modo !== 'recuperar' ? (
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
          ) : null}

          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          {aviso ? <Aviso tipo="info">{aviso}</Aviso> : null}

          <button type="submit" className="botao" disabled={carregando}>
            {carregando ? 'Um momento…' : titulo}
          </button>
        </form>

        {modo === 'entrar' ? (
          <button
            type="button"
            className="botao discreto auth-esqueci"
            onClick={() => {
              setModo('recuperar')
              setErro('')
              setAviso('')
            }}
          >
            Esqueci minha senha
          </button>
        ) : null}

        {modo === 'recuperar' ? (
          <button
            type="button"
            className="botao discreto auth-esqueci"
            onClick={() => {
              setModo('entrar')
              setErro('')
              setAviso('')
            }}
          >
            Voltar para o login
          </button>
        ) : null}
      </div>
    </div>
  )
}
