-- Created automatically by Cursor AI (2025-01-27)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
SET search_path TO public, audit;

-- Create custom types
CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'ingested', 'embedded', 'failed');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE export_format AS ENUM ('markdown', 'json', 'pdf');
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'enterprise');

-- Create organizations table
CREATE TABLE orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier plan_tier DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memberships table
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    page_count INTEGER,
    status document_status DEFAULT 'uploaded',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chunks table with vector support
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, page_number, chunk_index)
);

-- Create threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_stats table
CREATE TABLE usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    queries_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    documents_processed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, project_id, date)
);

-- Create audit_log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_orgs_slug ON orgs(slug);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_memberships_org_user ON memberships(org_id, user_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_chunks_document ON chunks(document_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_threads_project ON threads(project_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_usage_stats_org_date ON usage_stats(org_id, date);
CREATE INDEX idx_audit_log_org_user ON audit_log(org_id, user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Create Row Level Security (RLS) policies
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Create functions for RLS
CREATE OR REPLACE FUNCTION get_user_orgs(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY SELECT org_id FROM memberships WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
CREATE POLICY orgs_policy ON orgs
    FOR ALL USING (id IN (SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)));

CREATE POLICY projects_policy ON projects
    FOR ALL USING (org_id IN (SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)));

CREATE POLICY documents_policy ON documents
    FOR ALL USING (project_id IN (
        SELECT id FROM projects WHERE org_id IN (
            SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)
        )
    ));

CREATE POLICY chunks_policy ON chunks
    FOR ALL USING (document_id IN (
        SELECT id FROM documents WHERE project_id IN (
            SELECT id FROM projects WHERE org_id IN (
                SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)
            )
        )
    ));

CREATE POLICY threads_policy ON threads
    FOR ALL USING (project_id IN (
        SELECT id FROM projects WHERE org_id IN (
            SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)
        )
    ));

CREATE POLICY messages_policy ON messages
    FOR ALL USING (thread_id IN (
        SELECT id FROM threads WHERE project_id IN (
            SELECT id FROM projects WHERE org_id IN (
                SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)
            )
        )
    ));

CREATE POLICY usage_stats_policy ON usage_stats
    FOR ALL USING (org_id IN (SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)));

CREATE POLICY audit_log_policy ON audit_log
    FOR ALL USING (org_id IN (SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)));

-- Create additional RLS policies for users and memberships
CREATE POLICY users_policy ON users
    FOR ALL USING (id IN (
        SELECT user_id FROM memberships WHERE org_id IN (
            SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)
        )
    ));

CREATE POLICY memberships_policy ON memberships
    FOR ALL USING (org_id IN (SELECT get_user_orgs(current_setting('app.current_user_id')::UUID)));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON orgs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints and invariants
-- Ensure chunks can only be created after document is ingested
ALTER TABLE chunks ADD CONSTRAINT chunks_document_ingested
    CHECK (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = chunks.document_id 
            AND documents.status IN ('ingested', 'embedded')
        )
    );

-- Ensure citations reference valid document and page
CREATE OR REPLACE FUNCTION validate_citation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if document exists and is embedded
    IF NOT EXISTS (
        SELECT 1 FROM documents 
        WHERE id = NEW.document_id 
        AND status = 'embedded'
    ) THEN
        RAISE EXCEPTION 'Citation references non-existent or non-embedded document';
    END IF;
    
    -- Check if page number is valid
    IF EXISTS (
        SELECT 1 FROM documents 
        WHERE id = NEW.document_id 
        AND page_count IS NOT NULL 
        AND NEW.page_number >= page_count
    ) THEN
        RAISE EXCEPTION 'Citation references invalid page number';
    END IF;
    
    -- Check if chunk exists
    IF NOT EXISTS (
        SELECT 1 FROM chunks 
        WHERE document_id = NEW.document_id 
        AND page_number = NEW.page_number 
        AND chunk_index = NEW.chunk_index
    ) THEN
        RAISE EXCEPTION 'Citation references non-existent chunk';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate citations in messages
CREATE TRIGGER validate_message_citations
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION validate_citation();

-- Add constraint to ensure usage stats are for valid orgs
ALTER TABLE usage_stats ADD CONSTRAINT usage_stats_valid_org
    CHECK (EXISTS (SELECT 1 FROM orgs WHERE id = org_id));

-- Add constraint to ensure audit log entries are for valid orgs/users
ALTER TABLE audit_log ADD CONSTRAINT audit_log_valid_org
    CHECK (org_id IS NULL OR EXISTS (SELECT 1 FROM orgs WHERE id = org_id));

ALTER TABLE audit_log ADD CONSTRAINT audit_log_valid_user
    CHECK (user_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE id = user_id));
