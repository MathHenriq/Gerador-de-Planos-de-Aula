-- ============================================================================
-- Entrada pelo Google: o perfil passa a aproveitar o nome que o Google informa.
--
-- Rode no SQL Editor do projeto, depois de 20260906_equipes.sql. É idempotente.
--
-- Quem entra pelo Google não passa pelo formulário de cadastro, então não há
-- `nome` nem `equipes` no metadado — o Google manda `full_name`/`name`. A
-- equipe continua sendo escolhida pela pessoa, na tela "Falta só isto"
-- (src/components/CompletarPerfil.tsx), logo depois de entrar.
--
-- ATENÇÃO — antes disso, ligue o provedor no painel do Supabase:
--   Authentication → Providers → Google → habilitar, e colar Client ID e
--   Client Secret criados no Google Cloud Console (APIs & Services →
--   Credentials → OAuth client ID, tipo "Web application").
--   No Google, a "Authorized redirect URI" é:
--     https://zwxityjsqutftkxjhbkq.supabase.co/auth/v1/callback
--   E, no Supabase, o domínio do site precisa estar em
--   Authentication → URL Configuration → Site URL / Redirect URLs.
-- ============================================================================

create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  equipe text;
begin
  insert into public.perfis (id, nome, email)
  values (
    new.id,
    -- Ordem de preferência: o que a pessoa digitou no cadastro; depois o que
    -- o provedor externo informou. Nunca inventa nome a partir do e-mail —
    -- é ela quem confirma isso na tela de completar o perfil.
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nome'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      ''
    ),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set email = excluded.email,
        nome = case when perfis.nome = '' then excluded.nome else perfis.nome end;

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

-- ----------------------------------------------------------------------------
-- Sobre quem pode entrar: com o Google ligado, qualquer pessoa com conta
-- Google consegue criar acesso — exatamente como já acontece hoje com o
-- cadastro por e-mail e senha, que também é aberto. Quem não está em equipe
-- nenhuma não vê plano de ninguém (é o que a RLS garante), então o pior caso é
-- uma conta vazia. Se algum dia a coordenação quiser fechar por domínio, o
-- lugar é uma trigger `before insert on auth.users` recusando e-mail fora de
-- @educbarueri.sp.gov.br — mas hoje há professores usando Gmail pessoal, e
-- isso os deixaria de fora.
-- ----------------------------------------------------------------------------
