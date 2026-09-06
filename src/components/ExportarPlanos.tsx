import { useMemo, useState } from 'react'

import {
  montarCaminhos,
  montarZip,
  semanasDisponiveis,
  type Organizacao,
} from '../exportar/pacote'
import type { PlanoDaEquipe } from '../supabase/planos'
import { Aviso, Campo } from './ui'

const ORGANIZACOES: { id: Organizacao; titulo: string; explica: string }[] = [
  {
    id: 'curso',
    titulo: 'Só por curso',
    explica: 'Uma pasta por curso, com todos os planos daquele curso soltos dentro.',
  },
  {
    id: 'curso-professor',
    titulo: 'Por curso e, dentro dele, por professor',
    explica: 'Dentro de "Oficina de Games", uma pasta para cada professor de Games.',
  },
  {
    id: 'professor',
    titulo: 'Só por professor',
    explica: 'Uma pasta por professor na raiz do ZIP, sem separar por curso.',
  },
]

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/**
 * Exportação em lote da Gestão: escolhe a semana, escolhe como as pastas ficam
 * organizadas e baixa um ZIP com o PDF de cada plano.
 *
 * Os PDFs são gerados aqui no navegador, um a um, com o mesmo motor do botão
 * "Baixar PDF" — então o arquivo que sai do ZIP é idêntico ao que o professor
 * baixaria pela tela dele.
 */
export function ExportarPlanos({ planos }: { planos: PlanoDaEquipe[] }) {
  const semanas = useMemo(() => semanasDisponiveis(planos), [planos])
  const [semana, setSemana] = useState(() => semanas[0]?.semana ?? '')
  const [incluirPrivados, setIncluirPrivados] = useState(true)
  const [organizacao, setOrganizacao] = useState<Organizacao | null>(null)
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null)
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState('')

  const selecionados = useMemo(
    () =>
      planos.filter((p) => {
        const daSemana = (p.dados.semana?.trim() || '(sem semana preenchida)') === semana
        return daSemana && (incluirPrivados || p.equipe_id)
      }),
    [planos, semana, incluirPrivados],
  )

  // Prévia da árvore de pastas: a Gestão confere antes de gastar o tempo de
  // gerar dezenas de PDFs.
  const previa = useMemo(() => {
    if (!organizacao) return []
    const porPasta = new Map<string, number>()
    for (const caminho of montarCaminhos(selecionados, organizacao).keys()) {
      const pasta = caminho.slice(0, caminho.lastIndexOf('/'))
      porPasta.set(pasta, (porPasta.get(pasta) ?? 0) + 1)
    }
    return [...porPasta.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [selecionados, organizacao])

  async function exportar() {
    if (!organizacao) return
    setErro('')
    setPronto('')
    setProgresso({ feitos: 0, total: selecionados.length })
    try {
      const zip = await montarZip(selecionados, organizacao, (feitos, total) =>
        setProgresso({ feitos, total }),
      )
      const nome = `Planos de aula Núcleo WIT - ${semana.replace(/\//g, '.')}.zip`
      baixar(zip, nome)
      setPronto(`${selecionados.length} plano(s) exportados em ${nome}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui montar o ZIP.')
    } finally {
      setProgresso(null)
    }
  }

  if (semanas.length === 0) {
    return <p className="explica">Ainda não há plano nenhum salvo para exportar.</p>
  }

  return (
    <div className="exportar">
      <p className="explica">
        Baixa o PDF de cada plano da semana escolhida, de todas as equipes, num ZIP só.
      </p>

      <Campo rotulo="Semana" dica="o campo Semana preenchido pelos professores">
        <select
          value={semana}
          onChange={(e) => {
            setSemana(e.target.value)
            setPronto('')
          }}
        >
          {semanas.map((s) => (
            <option value={s.semana} key={s.semana}>
              {s.semana} — {s.quantidade} plano(s)
            </option>
          ))}
        </select>
      </Campo>

      <label className="escolha-simples">
        <input
          type="checkbox"
          checked={incluirPrivados}
          onChange={(e) => setIncluirPrivados(e.target.checked)}
        />
        <span>
          Incluir também os planos que o professor não compartilhou
          <span className="dica"> — desmarcado, só entram os compartilhados com alguma equipe</span>
        </span>
      </label>

      <p className="explica" style={{ marginTop: 14 }}>
        <strong>Como quer separar as pastas?</strong>
      </p>
      <div className="organizacoes">
        {ORGANIZACOES.map((opcao) => (
          <label
            className={`organizacao${organizacao === opcao.id ? ' marcada' : ''}`}
            key={opcao.id}
          >
            <input
              type="radio"
              name="organizacao"
              checked={organizacao === opcao.id}
              onChange={() => {
                setOrganizacao(opcao.id)
                setPronto('')
              }}
            />
            <span>
              <strong>{opcao.titulo}</strong>
              <span className="explica">{opcao.explica}</span>
            </span>
          </label>
        ))}
      </div>

      {organizacao && selecionados.length ? (
        <div className="previa-pastas">
          <p className="explica">
            <strong>Vai sair assim</strong> ({selecionados.length} plano(s)):
          </p>
          <ul>
            {previa.map(([pasta, quantidade]) => (
              <li key={pasta}>
                {pasta}/ <span className="dica">{quantidade} plano(s)</span>
              </li>
            ))}
          </ul>
          {organizacao !== 'professor' ? (
            <p className="explica">
              As equipes sem plano nesta semana entram como pasta vazia, com um aviso dentro.
            </p>
          ) : null}
        </div>
      ) : null}

      {selecionados.length === 0 ? (
        <Aviso tipo="atencao">
          Nenhum plano nessa semana com os filtros atuais.
        </Aviso>
      ) : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {pronto ? <Aviso tipo="info">{pronto}</Aviso> : null}

      <div className="acoes" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="botao"
          onClick={exportar}
          disabled={!organizacao || selecionados.length === 0 || progresso !== null}
        >
          {progresso
            ? `Gerando ${progresso.feitos} de ${progresso.total}…`
            : 'Exportar ZIP'}
        </button>
        {!organizacao ? <span className="dica">Escolha como separar as pastas.</span> : null}
      </div>
    </div>
  )
}
