-- Scope legacy browser uploads to the two intentionally public Deal buckets.
-- Public object delivery is provided by each bucket's public flag and does not
-- require a storage.objects SELECT policy. Private and future buckets receive
-- no browser-role access from this migration.

drop policy "Allow public read 1c1bq73_0" on storage.objects;
drop policy "Allow public uploads 148yprt_0" on storage.objects;
drop policy "Allow public uploads 1c1bq73_0" on storage.objects;
drop policy "Display Image" on storage.objects;

create policy "Allow anon uploads to deal images"
on storage.objects
as permissive
for insert
to anon
with check (bucket_id = 'deal-images');

create policy "Allow anon uploads to public deal documents"
on storage.objects
as permissive
for insert
to anon
with check (bucket_id = 'deal-documents-public');
