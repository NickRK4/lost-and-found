-- Create users table
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = user_id);

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (user_id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
