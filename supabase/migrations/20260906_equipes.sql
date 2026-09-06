-- ============================================================================
-- Equipes, perfis e compartilhamento de planos — Núcleo WIT
--
-- Rode este arquivo inteiro no SQL Editor do projeto Supabase (uma vez).
-- É idempotente: rodar de novo não duplica nada.
--
-- O que ele cria:
--   equipes         os 6 cursos + Gestão
--   perfis          nome, e-mail e escolas habituais de cada professor
--   membros_equipe  quem está em qual equipe (um professor pode estar em várias)
--   planos.equipe_id  com qual equipe o plano foi compartilhado (null = só o autor)
--   planos_visao    a mesma tabela com o nome de quem compartilhou, para as listas
-- ============================================================================

-- ---------------------------------------------------------------- equipes ---
create table if not exists public.equipes (
  id text primary key,
  nome text not null,
  -- Valor correspondente em CURSOS (src/constants.ts); null para a Gestão,
  -- que não é um curso e sim o time que administra as equipes.
  curso text,
  ordem int not null default 0
);

insert into public.equipes (id, nome, curso, ordem) values
  ('games',       'Oficina de Games',        'Oficina de Games',       1),
  ('ia',          'Inteligência Artificial', 'Inteligência Artificial', 2),
  ('ambientes',   'Ambientes Inteligentes',  'Ambientes Inteligentes',  3),
  ('comunicacao', 'Comunicação Digital',     'Comunicação Digital',     4),
  ('metaverso',   'Metaverso',               'Metaverso',               5),
  ('integral',    'Integral',                'Integral',                6),
  ('gestao',      'Gestão',                  null,                      7)
on conflict (id) do update
  set nome = excluded.nome, curso = excluded.curso, ordem = excluded.ordem;

-- ----------------------------------------------------------------- perfis ---
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Nome e sobrenome como o professor assina o plano. Entra automaticamente
  -- no campo "Prof." quando ele faz uma cópia de um plano da equipe.
  nome text not null default '',
  email text not null default '',
  -- Os núcleos que esse professor costuma marcar — sugestão inicial na cópia.
  escolas_padrao text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- --------------------------------------------------------- membros_equipe ---
create table if not exists public.membros_equipe (
  professor_id uuid not null references auth.users(id) on delete cascade,
  equipe_id text not null references public.equipes(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (professor_id, equipe_id)
);

create index if not exists membros_equipe_equipe_idx on public.membros_equipe (equipe_id);

-- ------------------------------------------------- planos: compartilhamento --
alter table public.planos
  add column if not exists equipe_id text references public.equipes(id) on delete set null;

alter table public.planos
  add column if not exists copiado_de uuid references public.planos(id) on delete set null;

create index if not exists planos_equipe_idx
  on public.planos (equipe_id) where equipe_id is not null;

-- Permissões de tabela. O Supabase já concede isso por padrão às tabelas novas
-- do schema public, mas deixar explícito evita depender desse padrão.
grant select on public.equipes to authenticated;
grant select, insert, update on public.perfis to authenticated;
grant select, insert, update, delete on public.membros_equipe to authenticated;
grant select, insert, update, delete on public.planos to authenticated;

-- ------------------------------------------------------------- atualizado_em --
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- ============================================================================
-- Funções de apoio às políticas de RLS.
--
-- São SECURITY DEFINER de propósito: uma política de `membros_equipe` que
-- consultasse `membros_equipe` por dentro entraria em recursão infinita.
-- Rodando como dono, a função lê a tabela sem reaplicar RLS.
-- ============================================================================
create or replace function public.e_gestao()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros_equipe m
    where m.professor_id = auth.uid() and m.equipe_id = 'gestao'
  );
$$;

create or replace function public.minhas_equipes()
returns setof text language sql stable security definer set search_path = public as $$
  select equipe_id from public.membros_equipe where professor_id = auth.uid();
$$;

create or replace function public.compartilha_equipe_comigo(outro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.membros_equipe eu
    join public.membros_equipe ele on ele.equipe_id = eu.equipe_id
    where eu.professor_id = auth.uid() and ele.professor_id = outro
  );
$$;

revoke all on function public.e_gestao() from public;
revoke all on function public.minhas_equipes() from public;
revoke all on function public.compartilha_equipe_comigo(uuid) from public;
grant execute on function public.e_gestao() to authenticated;
grant execute on function public.minhas_equipes() to authenticated;
grant execute on function public.compartilha_equipe_comigo(uuid) to authenticated;

-- ============================================================================
-- RLS
-- ============================================================================

-- equipes: todo mundo logado lê; só a Gestão mexe.
alter table public.equipes enable row level security;
drop policy if exists equipes_leitura on public.equipes;
create policy equipes_leitura on public.equipes
  for select to authenticated using (true);
drop policy if exists equipes_escrita_gestao on public.equipes;
create policy equipes_escrita_gestao on public.equipes
  for all to authenticated using (public.e_gestao()) with check (public.e_gestao());

-- perfis: eu, quem divide equipe comigo (para mostrar "compartilhado por…"),
-- e a Gestão.
alter table public.perfis enable row level security;
drop policy if exists perfis_leitura on public.perfis;
create policy perfis_leitura on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.compartilha_equipe_comigo(id) or public.e_gestao());
drop policy if exists perfis_insercao on public.perfis;
create policy perfis_insercao on public.perfis
  for insert to authenticated with check (id = auth.uid());
drop policy if exists perfis_atualizacao on public.perfis;
create policy perfis_atualizacao on public.perfis
  for update to authenticated
  using (id = auth.uid() or public.e_gestao())
  with check (id = auth.uid() or public.e_gestao());

-- membros_equipe: leio as minhas equipes e quem está nelas; a Gestão vê tudo.
-- Entrar numa equipe é coisa do cadastro (o próprio professor escolhe), mas
-- NINGUÉM se coloca na Gestão sozinho, e tirar/mover é só a Gestão.
alter table public.membros_equipe enable row level security;
drop policy if exists membros_leitura on public.membros_equipe;
create policy membros_leitura on public.membros_equipe
  for select to authenticated
  using (
    professor_id = auth.uid()
    or equipe_id in (select public.minhas_equipes())
    or public.e_gestao()
  );
drop policy if exists membros_insercao on public.membros_equipe;
create policy membros_insercao on public.membros_equipe
  for insert to authenticated
  with check (
    (professor_id = auth.uid() and equipe_id <> 'gestao')
    or public.e_gestao()
  );
drop policy if exists membros_remocao on public.membros_equipe;
create policy membros_remocao on public.membros_equipe
  for delete to authenticated using (public.e_gestao());
drop policy if exists membros_atualizacao on public.membros_equipe;
create policy membros_atualizacao on public.membros_equipe
  for update to authenticated
  using (public.e_gestao()) with check (public.e_gestao());

-- planos: as políticas antigas (só o dono) são substituídas pelas de equipe.
-- Removidas pelo nome que tiverem, porque o esquema original foi aplicado à
-- mão no painel e o nome pode variar de projeto para projeto.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'planos'
  loop
    execute format('drop policy %I on public.planos', pol.policyname);
  end loop;
end $$;

alter table public.planos enable row level security;

create policy planos_leitura on public.planos
  for select to authenticated
  using (
    professor_id = auth.uid()
    or (equipe_id is not null and equipe_id in (select public.minhas_equipes()))
    or public.e_gestao()
  );

-- Só dá para compartilhar com uma equipe da qual você faz parte.
create policy planos_insercao on public.planos
  for insert to authenticated
  with check (
    professor_id = auth.uid()
    and (equipe_id is null or equipe_id in (select public.minhas_equipes()))
  );

-- Editar e excluir continuam sendo só do autor — a Gestão enxerga tudo, mas
-- não mexe no plano de ninguém.
create policy planos_atualizacao on public.planos
  for update to authenticated
  using (professor_id = auth.uid())
  with check (
    professor_id = auth.uid()
    and (equipe_id is null or equipe_id in (select public.minhas_equipes()))
  );

create policy planos_remocao on public.planos
  for delete to authenticated using (professor_id = auth.uid());

-- ============================================================================
-- Visão usada pelas listas: o plano + quem é o autor.
-- security_invoker = as RLS de `planos` e `perfis` continuam valendo para quem
-- consulta; a visão não é um atalho para ver plano dos outros.
-- ============================================================================
drop view if exists public.planos_visao;
create view public.planos_visao with (security_invoker = true) as
  select
    p.id,
    p.professor_id,
    p.equipe_id,
    p.copiado_de,
    p.dados,
    p.criado_em,
    p.atualizado_em,
    perf.nome  as autor_nome,
    perf.email as autor_email
  from public.planos p
  left join public.perfis perf on perf.id = p.professor_id;

grant select on public.planos_visao to authenticated;

-- ============================================================================
-- Cadastro novo: cria o perfil e já entra nas equipes escolhidas na tela.
-- As equipes vêm em raw_user_meta_data->'equipes' (ver src/components/Auth.tsx).
-- 'gestao' é filtrada aqui de propósito: metadado é escrito pelo próprio
-- usuário, então ninguém vira Gestão se cadastrando.
-- ============================================================================
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  equipe text;
begin
  insert into public.perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;

  for equipe in
    select jsonb_array_elements_text(
      case jsonb_typeof(new.raw_user_meta_data->'equipes')
        when 'array' then new.raw_user_meta_data->'equipes'
        else '[]'::jsonb
      end
    )
  loop
    if equipe <> 'gestao' and exists (select 1 from public.equipes e where e.id = equipe) then
      insert into public.membros_equipe (professor_id, equipe_id)
      values (new.id, equipe)
      on conflict do nothing;
    end if;
  end loop;

  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- ============================================================================
-- Carga inicial: os professores que já tinham conta antes das equipes.
-- ============================================================================

-- Perfil de todo mundo. O nome sai do último plano salvo (campo "Prof."),
-- que é o nome real digitado pelo professor; quem nunca salvou fica em branco
-- e preenche na primeira cópia.
insert into public.perfis (id, email, nome)
select
  u.id,
  coalesce(u.email, ''),
  coalesce((
    select p.dados->>'professor'
    from public.planos p
    where p.professor_id = u.id and coalesce(p.dados->>'professor', '') <> ''
    order by p.atualizado_em desc
    limit 1
  ), '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      nome = case when perfis.nome = '' then excluded.nome else perfis.nome end;

-- Escolas habituais: os núcleos do último plano salvo de cada professor.
update public.perfis p
set escolas_padrao = coalesce((
  select array(select jsonb_array_elements_text(pl.dados->'escolas'))
  from public.planos pl
  where pl.professor_id = p.id and jsonb_typeof(pl.dados->'escolas') = 'array'
  order by pl.atualizado_em desc
  limit 1
), '{}')
where p.escolas_padrao = '{}';

-- Equipes de cada professor, conforme a lista da coordenação.
-- alequitoss09@gmail.com fica sem equipe de propósito (conta fora do quadro).
--
-- ATENÇÃO: esta parte é a carga INICIAL. Rodar o arquivo de novo depois que a
-- Gestão já tiver remanejado alguém recoloca a pessoa na equipe de origem (o
-- `on conflict do nothing` evita duplicata, não o retorno). Depois da primeira
-- execução, mova professor pela tela da Gestão, não rodando isto de novo.
with atribuicoes(email, equipe_id) as (
  values
    ('wit.gustavosantana@educbarueri.sp.gov.br',    'integral'),
    ('wit.gustavosantana@educbarueri.sp.gov.br',    'ambientes'),
    ('guigrs12@gmail.com',                          'integral'),
    ('guigrs12@gmail.com',                          'ia'),
    ('wit.miguelmedeiros@educbarueri.sp.gov.br',    'ambientes'),
    ('wit.gustavosanatana@educbarueri.sp.gov.br',   'integral'),
    ('wit.gustavosanatana@educbarueri.sp.gov.br',   'ambientes'),
    ('maker.guilhermesilva@educbarueri.sp.gov.br',  'integral'),
    ('maker.guilhermesilva@educbarueri.sp.gov.br',  'ia'),
    ('wit.matheuscorreia@gmail.com',                'integral'),
    ('wit.matheuscorreia@gmail.com',                'games'),
    ('wit.victormoitinho@educbarueri.sp.gov.br',    'integral'),
    ('wit.victormoitinho@educbarueri.sp.gov.br',    'metaverso'),
    ('wit.viniciusbarreto@educbarueri.sp.gov.br',   'metaverso'),
    ('wit.deividsantos@educbarueri.sp.gov.br',      'games'),
    ('wit.dantenovelo@educbarueri.sp.gov.br',       'ia'),
    ('wit.lorenasantos@educbarueri.sp.gov.br',      'integral'),
    ('wit.felipeoliveira@educbarueri.sp.gov.br',    'metaverso'),
    ('wit.matheuscorreia@educbarueri.sp.gov.br',    'integral'),
    ('wit.matheuscorreia@educbarueri.sp.gov.br',    'games'),
    ('wit.leticiasousa@educbarueri.sp.gov.br',      'games'),
    ('wit.nicolascorrea@educbarueri.sp.gov.br',     'games'),
    ('wit.alexandresantos@educbarueri.sp.gov.br',   'metaverso'),
    ('wit.mateusramalho@educbarueri.sp.gov.br',     'comunicacao'),
    ('wit.grazyellecosta@educbarueri.sp.gov.br',    'comunicacao'),
    ('wit.joycemelo@educbarueri.sp.gov.br',         'comunicacao'),
    ('wit.mayconnascimento@educbarueri.sp.gov.br',  'comunicacao'),
    ('wit.gabrielcunha@educbarueri.sp.gov.br',      'comunicacao'),
    ('wit.mayarapereira@educbarueri.sp.gov.br',     'ia'),
    ('wit.matheusmacedo@educbarueri.sp.gov.br',     'ia'),
    ('guilhermevalton7@gmail.com',                  'gestao')
)
insert into public.membros_equipe (professor_id, equipe_id)
select u.id, a.equipe_id
from atribuicoes a
join auth.users u on lower(u.email) = lower(a.email)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Para acrescentar alguém à Gestão depois, é só isto (troque o e-mail):
--
--   insert into public.membros_equipe (professor_id, equipe_id)
--   select id, 'gestao' from auth.users where lower(email) = lower('fulano@exemplo.com')
--   on conflict do nothing;
-- ----------------------------------------------------------------------------
