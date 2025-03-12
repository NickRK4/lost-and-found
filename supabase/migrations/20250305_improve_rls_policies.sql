-- Drop existing permissive policies
DROP POLICY IF EXISTS "Public read access to users" ON public.users;
DROP POLICY IF EXISTS "Public read access to posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to post images" ON storage.objects;

-- Create more restrictive policies for users table
CREATE POLICY "Users can view profiles but not password_hash"
  ON public.users FOR SELECT
  USING (true)
  WITH CHECK (false);

-- Create policy to prevent access to password_hash
ALTER TABLE public.users ALTER COLUMN password_hash SET NOT VISIBLE;

-- Create restrictive policies for posts table
CREATE POLICY "Anyone can view active posts"
  ON public.posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can only insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create restrictive policies for chats table
CREATE POLICY "Users can only view their own chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = claimer_id);

CREATE POLICY "Users can only insert chats they are part of"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = claimer_id);

CREATE POLICY "Users can only update chats they are part of"
  ON public.chats FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = claimer_id);

-- Create restrictive policies for messages table
CREATE POLICY "Users can only view messages from their chats"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT creator_id FROM public.chats WHERE id = chat_id
      UNION
      SELECT claimer_id FROM public.chats WHERE id = chat_id
    )
  );

CREATE POLICY "Users can only insert messages to their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT creator_id FROM public.chats WHERE id = chat_id
      UNION
      SELECT claimer_id FROM public.chats WHERE id = chat_id
    )
  );

-- Create storage policies
CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can only upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
