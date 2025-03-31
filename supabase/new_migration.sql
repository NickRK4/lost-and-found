
-- Migration file to implement proper Row Level Security (RLS) for all tables
-- Date: 2025-03-31

-- First, drop any existing RLS policies to start fresh
-- Drop existing policies from schema.sql
DROP POLICY IF EXISTS "Public read access to users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.users;
DROP POLICY IF EXISTS "Public read access to posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can insert chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can update chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own claim questionnaire or questionnaire for their posts" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Users can create their own claim questionnaire" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Only post owners can update claim questionnaire" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Drop policies we're about to create
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert chats they are part of" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete chats they created" ON public.chats;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their claim questionnaire or questionnaire for their posts" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Users can create their own claim questionnaire" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Only post owners can update claim questionnaire" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Users can delete their own claim questionnaire" ON public.claim_questionnaire;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Make sure RLS is enabled for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==================== USERS TABLE ====================
-- Anyone can view basic user profiles (except sensitive data)
CREATE POLICY "Anyone can view user profiles"
    ON public.users FOR SELECT
    USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can only insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete their own profile"
    ON public.users FOR DELETE
    USING (auth.uid() = id);

-- ==================== POSTS TABLE ====================
-- Anyone can view active posts
CREATE POLICY "Anyone can view posts"
    ON public.posts FOR SELECT
    USING (true);

-- Users can only insert their own posts
CREATE POLICY "Users can insert their own posts"
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update their own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete their own posts"
    ON public.posts FOR DELETE
    USING (auth.uid() = user_id);

-- ==================== CHATS TABLE ====================
-- Users can only view chats they are part of
CREATE POLICY "Users can view their own chats"
    ON public.chats FOR SELECT
    USING (auth.uid() = creator_id OR auth.uid() = claimer_id);

-- Users can only insert chats they are part of
CREATE POLICY "Users can insert chats they are part of"
    ON public.chats FOR INSERT
    WITH CHECK (auth.uid() = creator_id OR auth.uid() = claimer_id);

-- Users can only update chats they are part of
CREATE POLICY "Users can update their own chats"
    ON public.chats FOR UPDATE
    USING (auth.uid() = creator_id OR auth.uid() = claimer_id)
    WITH CHECK (auth.uid() = creator_id OR auth.uid() = claimer_id);

-- Users can only delete chats they created
CREATE POLICY "Users can delete chats they created"
    ON public.chats FOR DELETE
    USING (auth.uid() = creator_id);

-- ==================== MESSAGES TABLE ====================
-- Users can only view messages from chats they are part of
CREATE POLICY "Users can view messages from their chats"
    ON public.messages FOR SELECT
    USING (
        chat_id IN (
            SELECT id FROM public.chats
            WHERE creator_id = auth.uid() OR claimer_id = auth.uid()
        )
    );

-- Users can only insert their own messages to chats they are part of
CREATE POLICY "Users can insert their own messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        chat_id IN (
            SELECT id FROM public.chats
            WHERE creator_id = auth.uid() OR claimer_id = auth.uid()
        )
    );

-- Users can only update their own messages
CREATE POLICY "Users can update their own messages"
    ON public.messages FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own messages
CREATE POLICY "Users can delete their own messages"
    ON public.messages FOR DELETE
    USING (auth.uid() = user_id);

-- ==================== CLAIM questionnaire TABLE ====================
-- Users can view claim questionnaire they submitted or for posts they own
CREATE POLICY "Users can view their claim questionnaire or questionnaire for their posts"
    ON public.claim_questionnaire FOR SELECT
    USING (
        claimer_id = auth.uid() OR
        post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
    );

-- Users can only insert claim questionnaire for themselves
CREATE POLICY "Users can create their own claim questionnaire"
    ON public.claim_questionnaire FOR INSERT
    WITH CHECK (claimer_id = auth.uid());

-- Only post owners can update claim questionnaire (to change status)
CREATE POLICY "Only post owners can update claim questionnaire"
    ON public.claim_questionnaire FOR UPDATE
    USING (
        post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
    )
    WITH CHECK (
        post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
    );

-- Users can delete their own claim questionnaire
CREATE POLICY "Users can delete their own claim questionnaire"
    ON public.claim_questionnaire FOR DELETE
    USING (claimer_id = auth.uid());

-- ==================== NOTIFICATIONS TABLE ====================
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can only update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own notifications
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

-- ==================== STORAGE POLICIES ====================
-- Anyone can view avatars and post images
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can view post images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-images');

-- Authenticated users can upload their own avatars
CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL
    );

-- Authenticated users can upload post images
CREATE POLICY "Authenticated users can upload post images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'post-images' AND
        auth.uid() IS NOT NULL
    );

-- Users can only delete their own uploads
CREATE POLICY "Users can delete their own uploads"
    ON storage.objects FOR DELETE
    USING (auth.uid()::text = owner);