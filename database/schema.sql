-- Schema for GovFlow AI 2.0

-- Drop tables if they exist (for easy resetting/seeding)
DROP TABLE IF EXISTS officer_metrics CASCADE;
DROP TABLE IF EXISTS anomaly_reports CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Citizen', 'Clerk', 'Officer', 'Manager', 'Super Admin')),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requests Table
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    reference_number VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'Income Certificate', 
        'Caste Certificate', 
        'Residence Certificate', 
        'Complaint Registration', 
        'Business License', 
        'Land Approval', 
        'Scholarship Request', 
        'Pension Request', 
        'General Service Request'
    )),
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'Draft', 
        'Submitted', 
        'In_Review_Clerk', 
        'In_Review_Officer', 
        'In_Review_Manager', 
        'Returned_For_Correction', 
        'Approved', 
        'Rejected'
    )) DEFAULT 'Submitted',
    current_stage VARCHAR(20) NOT NULL CHECK (current_stage IN ('Citizen', 'Clerk', 'Officer', 'Manager', 'Completed')) DEFAULT 'Clerk',
    current_assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(15) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    medical_urgency BOOLEAN DEFAULT FALSE,
    legal_urgency BOOLEAN DEFAULT FALSE,
    citizen_category VARCHAR(30) DEFAULT 'General',
    sla_deadline TIMESTAMP NOT NULL,
    is_escalated BOOLEAN DEFAULT FALSE,
    last_action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments Table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    assigner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Completed', 'Returned', 'Escalated')) DEFAULT 'Pending',
    remarks TEXT
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('email', 'in_app', 'escalation', 'deadline_warning', 'approval', 'rejection')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predictions Table
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE UNIQUE,
    delay_probability DOUBLE PRECISION DEFAULT 0.0,
    expected_completion_date TIMESTAMP,
    risk_level VARCHAR(15) CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    confidence_score DOUBLE PRECISION DEFAULT 0.0,
    sla_violation_probability DOUBLE PRECISION DEFAULT 0.0,
    suggested_intervention TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomaly Reports Table
CREATE TABLE anomaly_reports (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    suspect_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    risk_score DOUBLE PRECISION DEFAULT 0.0,
    reasons TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Officer Metrics Table
CREATE TABLE officer_metrics (
    id SERIAL PRIMARY KEY,
    officer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    pending_count INTEGER DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    average_time_seconds DOUBLE PRECISION DEFAULT 0.0,
    escalation_count INTEGER DEFAULT 0,
    rejection_rate DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance and quick searches
CREATE INDEX idx_requests_reference ON requests(reference_number);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_current_stage ON requests(current_stage);
CREATE INDEX idx_requests_assignee ON requests(current_assignee_id);
CREATE INDEX idx_assignments_request ON assignments(request_id);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;
