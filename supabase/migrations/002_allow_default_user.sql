-- Allow default-user (UUID) to create trips without authentication
create policy "Allow default user trips" on trips
  for insert with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid or auth.uid() = user_id);

-- Allow reading default-user trips
create policy "Allow default user read" on trips
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid or auth.uid() = user_id);

-- Allow updating default-user trips
create policy "Allow default user update" on trips
  for update using (user_id = '00000000-0000-0000-0000-000000000000'::uuid or auth.uid() = user_id);

-- Allow travelers insert for default-user trips
create policy "Allow default user travelers insert" on travelers
  for insert with check (
    exists (
      select 1 from trips where trips.id = trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow travelers read for default-user trips
create policy "Allow default user travelers read" on travelers
  for select using (
    exists (
      select 1 from trips where trips.id = travelers.trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow travelers update for default-user trips
create policy "Allow default user travelers update" on travelers
  for update using (
    exists (
      select 1 from trips where trips.id = trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow travelers delete for default-user trips
create policy "Allow default user travelers delete" on travelers
  for delete using (
    exists (
      select 1 from trips where trips.id = trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expenses insert for default-user trips
create policy "Allow default user expenses insert" on expenses
  for insert with check (
    exists (
      select 1 from trips where trips.id = trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expenses read for default-user trips
create policy "Allow default user expenses read" on expenses
  for select using (
    exists (
      select 1 from trips where trips.id = expenses.trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expenses update for default-user trips
create policy "Allow default user expenses update" on expenses
  for update using (
    exists (
      select 1 from trips where trips.id = trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expenses delete for default-user trips
create policy "Allow default user expenses delete" on expenses
  for delete using (
    exists (
      select 1 from trips where trips.id = trip_id and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expense_shares insert for default-user trips
create policy "Allow default user expense_shares insert" on expense_shares
  for insert with check (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_id
      and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expense_shares read for default-user trips
create policy "Allow default user expense_shares read" on expense_shares
  for select using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_shares.expense_id
      and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expense_shares update for default-user trips
create policy "Allow default user expense_shares update" on expense_shares
  for update using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_id
      and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );

-- Allow expense_shares delete for default-user trips
create policy "Allow default user expense_shares delete" on expense_shares
  for delete using (
    exists (
      select 1 from expenses
      join trips on trips.id = expenses.trip_id
      where expenses.id = expense_id
      and (trips.user_id = '00000000-0000-0000-0000-000000000000'::uuid or trips.user_id = auth.uid())
    )
  );
