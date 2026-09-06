import { useState } from 'react'

import { EQUIPES_DE_CURSO } from '../constants'
import { atualizarMeuPerfil, entrarNasEquipes, type Perfil } from '../supabase/equipes'
import { Aviso, Campo } from './ui'

/**
 * "Complete seu perfil": nome e equipe de quem entrou sem passar pelo
 * formulário de cadastro.
 *
 * É o caso de quem entra pelo Google — o Google diz o nome e o e-mail, mas
 * não tem como saber que existe um Núcleo WIT com equipes por curso. Sem esta
 * tela, a pessoa entraria sem equipe nenhuma e ficaria sem entender por que
 * não vê nem compartilha plano nenhum.
 *
 * Também aparece para quem, por qualquer motivo, ficou sem equipe — e dá para
 * fechar e resolver depois: a pessoa continua conseguindo gerar o PDF.
 */
export function CompletarPerfil({
  perfil,
  aoConcluir,
  aoFechar,
}: {
  perfil: Perfil
  aoConcluir: () => void
  aoFechar: () => void
}) {
  const [nome, setNome] = useState(perfil.nome)
  const [equipes, setEquipes] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function alternar(id: string) {
    setEquipes((atual) => (atual.includes(id) ? atual.filter((e) => e !== id) : [...atual, id]))
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      await atualizarMeuPerfil({ nome: nome.trim() })
      await entrarNasEquipes(equipes)
      aoConcluir()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar. Tente de novo.')
      setSalvando(false)
    }
  }

  return (
    <div className="modal-fundo">
      <div className="modal-cartao" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Falta só isto</h2>
          <button type="button" className="botao icone" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <p className="explica">
          Você entrou como <strong>{perfil.email}</strong>, mas ainda não está em nenhuma equipe —
          é a equipe que define quais planos dos colegas você enxerga e com quem pode compartilhar
          os seus.
        </p>

        {/* Quem já usava o gerador e entrou pelo Google com OUTRO e-mail cai
            exatamente aqui: conta nova, sem equipe e sem os planos antigos.
            Avisar neste ponto é o que transforma uma conta duplicada
            silenciosa em algo que a pessoa percebe na hora. */}
        <Aviso tipo="atencao">
          Se você já usava o gerador com outro e-mail, <strong>esta é uma conta nova e separada</strong> —
          seus planos salvos continuam na conta antiga. Saia e entre com o e-mail de sempre (pelo
          Google ou por senha, tanto faz: com o mesmo e-mail é a mesma conta).
        </Aviso>

        <Campo rotulo="Nome e sobrenome" dica="é o que sai no campo Prof. do plano">
          <input
            type="text"
            value={nome}
            placeholder="Ex.: Nicolas Correa"
            autoComplete="name"
            onChange={(e) => setNome(e.target.value)}
          />
        </Campo>

        <fieldset className="equipes-escolha" style={{ marginTop: 14 }}>
          <legend>Qual equipe você faz parte?</legend>
          <p className="explica">
            Marque quantas forem — quem dá aula no Integral e num curso faz parte das duas.
          </p>
          <div className="equipes-lista">
            {EQUIPES_DE_CURSO.map((equipe) => (
              <label
                className={`equipe-opcao${equipes.includes(equipe.id) ? ' marcada' : ''}`}
                key={equipe.id}
              >
                <input
                  type="checkbox"
                  checked={equipes.includes(equipe.id)}
                  onChange={() => alternar(equipe.id)}
                />
                <span>{equipe.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        <div className="acoes" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="botao"
            onClick={salvar}
            disabled={salvando || !nome.trim() || equipes.length === 0}
          >
            {salvando ? 'Salvando…' : 'Salvar e continuar'}
          </button>
          <button type="button" className="botao discreto" onClick={aoFechar} disabled={salvando}>
            Agora não
          </button>
        </div>
        <p className="explica">
          Escolheu errado? A Gestão troca sua equipe a qualquer momento.
        </p>
      </div>
    </div>
  )
}
