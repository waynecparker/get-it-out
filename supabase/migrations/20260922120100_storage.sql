-- Private Storage bucket for recorded audio, path convention
-- {user_id}/{recording_id}.m4a. Not public — access only via RLS-style
-- storage policies below, or short-lived signed URLs for playback.

insert into storage.buckets (id, name, public)
values ('audio-recordings', 'audio-recordings', false)
on conflict (id) do nothing;

create policy "Users can upload to own audio folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'audio-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own audio files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'audio-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own audio files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'audio-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
