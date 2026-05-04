-- Remove foreign key constraint on user_id to allow default user without auth.users entry
alter table trips drop constraint trips_user_id_fkey;
