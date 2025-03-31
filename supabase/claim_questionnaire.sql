-- Create claim questionnaires table
CREATE TABLE IF NOT EXISTS claim_questionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  claimer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lost_date TEXT NOT NULL,
  specific_details TEXT NOT NULL,
  has_picture BOOLEAN NOT NULL DEFAULT false,
  picture_url TEXT,
  agreed_to_policy BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only submit one questionnaire per post
  CONSTRAINT unique_claimer_post UNIQUE (claimer_id, post_id)
);

-- Add RLS policies
ALTER TABLE claim_questionnaires ENABLE ROW LEVEL SECURITY;

-- Policy for inserting claim questionnaires (any authenticated user)
CREATE POLICY "Users can create their own claim questionnaires" 
ON claim_questionnaires FOR INSERT 
TO authenticated 
WITH CHECK (claimer_id = auth.uid());

-- Policy for viewing claim questionnaires (owner of the post or the claimer)
CREATE POLICY "Users can view their own claim questionnaires or questionnaires for their posts" 
ON claim_questionnaires FOR SELECT 
TO authenticated 
USING (
  claimer_id = auth.uid() OR 
  post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
);

-- Policy for updating claim questionnaires (only post owner can update status)
CREATE POLICY "Only post owners can update claim questionnaires" 
ON claim_questionnaires FOR UPDATE 
TO authenticated 
USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()))
WITH CHECK (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

-- Create notification table for new claims
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for viewing notifications (only the recipient)
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Policy for updating notifications (only the recipient)
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());