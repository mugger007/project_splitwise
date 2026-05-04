-- Create trips table
create table if not exists trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  trip_name text not null,
  currency text default 'USD',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create travelers table
create table if not exists travelers (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now(),
  unique(trip_id, name)
);

-- Create expenses table
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  description text not null,
  amount numeric(10, 2) not null,
  category text not null,
  paid_by text not null,
  split_type text default 'equal' check (split_type in ('equal', 'custom')),
  date date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create expense_shares table (for custom splits)
create table if not exists expense_shares (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid not null references expenses(id) on delete cascade,
  traveler_name text not null,
  share_amount numeric(10, 2) not null,
  created_at timestamp with time zone default now(),
  unique(expense_id, traveler_name)
);

-- Create indexes for query performance
create index if not exists idx_trips_user_id on trips(user_id);
create index if not exists idx_travelers_trip_id on travelers(trip_id);
create index if not exists idx_expenses_trip_id on expenses(trip_id);
create index if not exists idx_expense_shares_expense_id on expense_shares(expense_id);

-- Enable RLS (Row Level Security)
alter table trips enable row level security;
alter table travelers enable row level security;
alter table expenses enable row level security;
alter table expense_shares enable row level security;

-- RLS Policies for trips
create policy "Users can view own trips" on trips
  for select using (auth.uid() = user_id);

create policy "Users can insert own trips" on trips
  for insert with check (auth.uid() = user_id);

create policy "Users can update own trips" on trips
  for update using (auth.uid() = user_id);

create policy "Users can delete own trips" on trips
  for delete using (auth.uid() = user_id);

-- RLS Policies for travelers (based on trip ownership)
create policy "Users can view travelers of own trips" on travelers
  for select using (
    exists (
      select 1 from trips where trips.id = travelers.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert travelers to own trips" on travelers
  for insert with check (
    exists (
      select 1 from trips where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can update travelers of own trips" on travelers
  for update using (
    exists (
      select 1 from trips where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete travelers of own trips" on travelers
  for delete using (
    exists (
      select 1 from trips where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );

-- RLS Policies for expenses
create policy "Users can view expenses of own trips" on expenses
  for select using (
    exists (
      select 1 from trips where trips.id = expenses.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert expenses to own trips" on expenses
  for insert with check (
    exists (
      select 1 from trips where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can update expenses in own trips" on expenses
  for update using (
    exists (
      select 1 from trips where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete expenses from own trips" on expenses
  for delete using (
    exists (
      select 1 from trips where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );

-- RLS Policies for expense_shares
create policy "Users can view shares of own trip expenses" on expense_shares
  for select using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_shares.expense_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert shares to own trip expenses" on expense_shares
  for insert with check (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Users can update shares of own trip expenses" on expense_shares
  for update using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete shares from own trip expenses" on expense_shares
  for delete using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_id
      and trips.user_id = auth.uid()
    )
  );
