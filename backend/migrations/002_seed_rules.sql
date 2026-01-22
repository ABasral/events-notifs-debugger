-- Seed users and follower relationships

-- Create 5 users
INSERT INTO users (id, username, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'alice', 'alice@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'bob', 'bob@example.com'),
    ('33333333-3333-3333-3333-333333333333', 'charlie', 'charlie@example.com'),
    ('44444444-4444-4444-4444-444444444444', 'diana', 'diana@example.com'),
    ('55555555-5555-5555-5555-555555555555', 'eve', 'eve@example.com')
ON CONFLICT (username) DO NOTHING;

-- Create follower relationships
-- Bob follows Alice
INSERT INTO followers (user_id, follows_user_id) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Charlie follows Alice
INSERT INTO followers (user_id, follows_user_id) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Diana follows Alice
INSERT INTO followers (user_id, follows_user_id) VALUES
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Eve follows Bob
INSERT INTO followers (user_id, follows_user_id) VALUES
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Alice follows Charlie
INSERT INTO followers (user_id, follows_user_id) VALUES
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;
