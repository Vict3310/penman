-- The media bucket also accepts short listing videos. The admin uploader
-- enforces 5 MB per image and 50 MB per video before requesting a signed URL.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm'
    ]
where id = 'media';
