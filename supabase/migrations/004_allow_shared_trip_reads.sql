-- The app currently has no authentication, so every trip belongs to the shared app.
-- Keep read access consistent across a trip and its related records.
create policy "Allow shared app trip reads" on trips
  for select using (true);

create policy "Allow shared app traveler reads" on travelers
  for select using (true);

create policy "Allow shared app expense reads" on expenses
  for select using (true);

create policy "Allow shared app expense share reads" on expense_shares
  for select using (true);