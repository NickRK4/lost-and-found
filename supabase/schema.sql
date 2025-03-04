-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.chats;
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.users;

-- Create tables
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

CREATE TABLE public.chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    claimer_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_post_id
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_creator_id
        FOREIGN KEY (creator_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_claimer_id
        FOREIGN KEY (claimer_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_chat_id
        FOREIGN KEY (chat_id)
        REFERENCES public.chats(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_chats_post_id ON public.chats(post_id);
CREATE INDEX idx_chats_creator_id ON public.chats(creator_id);
CREATE INDEX idx_chats_claimer_id ON public.chats(claimer_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for users table
CREATE POLICY "Public read access to users"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can update their own record"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert"
    ON public.users FOR INSERT
    USING (true);

-- Create permissive policies for posts table
CREATE POLICY "Public read access to posts"
    ON public.posts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert posts"
    ON public.posts FOR INSERT
    USING (true);

CREATE POLICY "Authenticated users can update their own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = user_id);

-- Create permissive policies for chats table
CREATE POLICY "Authenticated users can view chats"
    ON public.chats FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert chats"
    ON public.chats FOR INSERT
    USING (true);

CREATE POLICY "Authenticated users can update chats"
    ON public.chats FOR UPDATE
    USING (true);

-- Create permissive policies for messages table
CREATE POLICY "Authenticated users can view messages"
    ON public.messages FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert messages"
    ON public.messages FOR INSERT
    USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create permissive storage policies
CREATE POLICY "Public read access to avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    USING (true);

CREATE POLICY "Public read access to post images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
    ON storage.objects FOR INSERT
    USING (true);
