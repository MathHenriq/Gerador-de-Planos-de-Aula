-- ============================================================================
-- Plano mestre: um plano por equipe por semana, feito por um responsável.
--
-- Rode no SQL Editor do projeto, depois de 20260906_equipes.sql e
-- 20260906_login_google.sql. É idempotente.
--
-- O problema: em algumas equipes cada professor fazia o próprio plano da
-- mesma semana, e a equipe acabava com três versões diferentes. A regra agora:
--
--   1. Um professor ASSUME a semana da equipe (tabela responsaveis_semana).
--      A partir daí só ele cria e altera o plano da equipe daquela semana; os
--      colegas veem o plano e combinam as correções com ele.
--   2. Cada equipe tem no máximo UM plano compartilhado por semana.
--   3. Só dá para assumir semana, criar ou alterar plano da equipe na semana
--      atual e nas duas seguintes (horário de Brasília).
--
-- Plano privado (equipe_id null) — inclusive a cópia que cada professor faz
-- do plano da equipe com o nome e os núcleos dele — não passa por nada disso.
--
-- As regras ficam em triggers, não só em RLS, para o professor receber uma
-- mensagem que dá para entender ("a semana está com Fulano") em vez de um
-- "violates row-level security policy".
-- ============================================================================

-- ------------------------------------------------------ planos.semana_inicio --
-- Segunda-feira da semana do plano. `dados->>'semana'` continua sendo o texto
-- que vai no PDF; esta coluna é o que o banco usa para aplicar as regras.
alter table public.planos add column if not exists semana_inicio date;

-- Um plano de equipe por semana.
create unique index if not exists planos_um_por_equipe_semana
  on public.planos (equipe_id, semana_inicio)
  where equipe_id is not null and semana_inicio is not null;

-- ---------------------------------------------------------- janela de semanas --
create or replace function public.segunda_atual()
returns date language sql stable as $$
  select date_trunc('week', now() at time zone 'America/Sao_Paulo')::date;
$$;

create or replace function public.semana_aberta(semana date)
returns boolean language sql stable as $$
  select semana is not null
    and extract(isodow from semana) = 1
    and semana between public.segunda_atual() and public.segunda_atual() + 14;
$$;

grant execute on function public.segunda_atual() to authenticated;
grant execute on function public.semana_aberta(date) to authenticated;

-- ------------------------------------------------------ responsaveis_semana --
create table if not exists public.responsaveis_semana (
  equipe_id text not null references public.equipes(id) on delete cascade,
  semana_inicio date not null check (extract(isodow from semana_inicio) = 1),
  professor_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (equipe_id, semana_inicio)
);

grant select, insert, delete on public.responsaveis_semana to authenticated;

alter table public.responsaveis_semana enable row level security;

drop policy if exists responsaveis_leitura on public.responsaveis_semana;
create policy responsaveis_leitura on public.responsaveis_semana
  for select to authenticated
  using (equipe_id in (select public.minhas_equipes()) or public.e_gestao());

-- Só assume em nome próprio, numa equipe de curso da qual faz parte.
drop policy if exists responsaveis_insercao on public.responsaveis_semana;
create policy responsaveis_insercao on public.responsaveis_semana
  for insert to authenticated
  with check (
    professor_id = auth.uid()
    and equipe_id <> 'gestao'
    and equipe_id in (select public.minhas_equipes())
  );

-- Largar a semana: o próprio responsável (se ainda não salvou o plano, ver
-- trigger abaixo) ou a Gestão, que destrava quando alguém some.
drop policy if exists responsaveis_remocao on public.responsaveis_semana;
create policy responsaveis_remocao on public.responsaveis_semana
  for delete to authenticated
  using (professor_id = auth.uid() or public.e_gestao());

create or replace function public.conferir_responsavel_semana()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  dono text;
begin
  if tg_op = 'INSERT' then
    if not public.semana_aberta(new.semana_inicio) then
      raise exception using
        errcode = 'P0001',
        message = 'Só dá para assumir a semana atual ou uma das duas próximas.';
    end if;

    select coalesce(nullif(p.nome, ''), p.email, 'outro professor') into dono
    from public.responsaveis_semana r
    left join public.perfis p on p.id = r.professor_id
    where r.equipe_id = new.equipe_id and r.semana_inicio = new.semana_inicio;
    if found then
      raise exception using
        errcode = 'P0001',
        message = format('Esta semana já tem responsável: %s. Converse com o grupo.', dono);
    end if;
    return new;
  end if;

  -- DELETE: o responsável não larga uma semana que já tem plano salvo — o
  -- plano ficaria sem dono. A Gestão pode, para destravar a equipe.
  if old.professor_id = auth.uid() and not public.e_gestao() and exists (
    select 1 from public.planos pl
    where pl.equipe_id = old.equipe_id and pl.semana_inicio = old.semana_inicio
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'O plano da equipe desta semana já foi salvo — para passar a semana para outra pessoa, fale com a Gestão.';
  end if;

  -- Quando a Gestão destrava uma semana que já tinha plano, esse plano volta
  -- a ser só do autor (nada se perde) e deixa de ocupar a vaga da equipe —
  -- senão o novo responsável ficaria barrado por um plano que não pode editar.
  update public.planos
  set equipe_id = null
  where equipe_id = old.equipe_id and semana_inicio = old.semana_inicio;

  return old;
end $$;

drop trigger if exists conferir_responsavel_semana on public.responsaveis_semana;
create trigger conferir_responsavel_semana
  before insert or delete on public.responsaveis_semana
  for each row execute function public.conferir_responsavel_semana();

-- -------------------------------------------------- planos: regras da semana --
create or replace function public.conferir_plano_da_semana()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  responsavel uuid;
  nome_responsavel text;
  autor_existente text;
  equipe_nome text;
begin
  -- Plano privado: regra nenhuma.
  if new.equipe_id is null then
    return new;
  end if;

  -- Plano de equipe salvo antes desta migração, sem semana: continua
  -- editável pelo autor como antes, desde que não mude de equipe.
  if new.semana_inicio is null then
    if tg_op = 'UPDATE' and old.equipe_id is not distinct from new.equipe_id
       and old.semana_inicio is null then
      return new;
    end if;
    raise exception using
      errcode = 'P0001',
      message = 'Escolha a semana do plano antes de compartilhar com a equipe.';
  end if;

  select nome into equipe_nome from public.equipes where id = new.equipe_id;

  if not public.semana_aberta(new.semana_inicio) then
    raise exception using
      errcode = 'P0001',
      message = 'Plano da equipe só pode ser criado ou alterado para a semana atual e as duas próximas.';
  end if;

  select r.professor_id, coalesce(nullif(p.nome, ''), p.email, 'outro professor')
    into responsavel, nome_responsavel
  from public.responsaveis_semana r
  left join public.perfis p on p.id = r.professor_id
  where r.equipe_id = new.equipe_id and r.semana_inicio = new.semana_inicio;

  if responsavel is null then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Ninguém assumiu esta semana da equipe %s ainda. Confirme que você é o responsável antes de salvar.',
        equipe_nome);
  end if;

  if responsavel <> auth.uid() then
    raise exception using
      errcode = 'P0001',
      message = format(
        'O responsável pelo plano desta semana da equipe %s é %s. Só essa pessoa cria ou altera o plano — converse com o grupo.',
        equipe_nome, nome_responsavel);
  end if;

  select coalesce(nullif(p.nome, ''), p.email, 'outro professor') into autor_existente
  from public.planos pl
  left join public.perfis p on p.id = pl.professor_id
  where pl.equipe_id = new.equipe_id
    and pl.semana_inicio = new.semana_inicio
    and pl.id <> new.id;
  if found then
    raise exception using
      errcode = 'P0001',
      message = format(
        'A equipe %s já tem um plano para esta semana (de %s). Abra e altere esse, em vez de criar outro.',
        equipe_nome, autor_existente);
  end if;

  return new;
end $$;

drop trigger if exists conferir_plano_da_semana on public.planos;
create trigger conferir_plano_da_semana
  before insert or update on public.planos
  for each row execute function public.conferir_plano_da_semana();

-- ------------------------------------------------------------- visões --------
drop view if exists public.planos_visao;
create view public.planos_visao with (security_invoker = true) as
  select
    p.id,
    p.professor_id,
    p.equipe_id,
    p.copiado_de,
    p.semana_inicio,
    p.dados,
    p.criado_em,
    p.atualizado_em,
    perf.nome  as autor_nome,
    perf.email as autor_email
  from public.planos p
  left join public.perfis perf on perf.id = p.professor_id;

grant select on public.planos_visao to authenticated;

drop view if exists public.responsaveis_visao;
create view public.responsaveis_visao with (security_invoker = true) as
  select
    r.equipe_id,
    r.semana_inicio,
    r.professor_id,
    r.criado_em,
    perf.nome  as professor_nome,
    perf.email as professor_email
  from public.responsaveis_semana r
  left join public.perfis perf on perf.id = r.professor_id;

grant select on public.responsaveis_visao to authenticated;
