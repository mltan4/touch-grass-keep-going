-- Roles enum and user_roles table (security best practice)
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Quotes table
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.quotes enable row level security;

create policy "Anyone can view quotes"
  on public.quotes for select
  to anon, authenticated
  using (true);

create policy "Admins can insert quotes"
  on public.quotes for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update quotes"
  on public.quotes for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete quotes"
  on public.quotes for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- Seed quotes
insert into public.quotes (text, author) values
  ('It does not matter how slowly you go as long as you do not stop.', 'Confucius'),
  ('Energy and persistence conquer all things.', 'Benjamin Franklin'),
  ('Through perseverance many people win success out of what seemed destined to be certain failure.', 'Benjamin Disraeli'),
  ('The greatest glory in living lies not in never falling, but in rising every time we fall.', 'Nelson Mandela'),
  ('You may encounter many defeats, but you must not be defeated.', 'Maya Angelou'),
  ('Rock bottom became the solid foundation on which I rebuilt my life.', 'J.K. Rowling'),
  ('If you''re going through hell, keep going.', 'Winston Churchill'),
  ('I can accept failure, everyone fails at something. But I can''t accept not trying.', 'Michael Jordan'),
  ('You miss 100% of the shots you don''t take.', 'Wayne Gretzky'),
  ('We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Aristotle'),
  ('Action is the foundational key to all success.', 'Pablo Picasso'),
  ('Do what you can, with what you have, where you are.', 'Theodore Roosevelt'),
  ('Success is not final, failure is not fatal, it is the courage to continue that counts.', 'Winston Churchill'),
  ('It always seems impossible until it''s done.', 'Nelson Mandela'),
  ('The difference between the impossible and the possible lies in a person''s determination.', 'Tommy Lasorda');