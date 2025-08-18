-- Messaging System Database Schema
-- Creates tables for team conversations and messages

-- Team Conversations Table
CREATE TABLE IF NOT EXISTS team_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_users (user1_id, user2_id),
    INDEX idx_last_message (last_message_at),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_conversation (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
);

-- Team Messages Table
CREATE TABLE IF NOT EXISTS team_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES team_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_conversation (conversation_id, created_at),
    INDEX idx_sender (sender_id, created_at),
    INDEX idx_receiver (receiver_id, is_read),
    INDEX idx_unread (receiver_id, is_read, created_at)
);

-- Message Attachments Table (for future file sharing)
CREATE TABLE IF NOT EXISTS message_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES team_messages(id) ON DELETE CASCADE,
    INDEX idx_message_attachments (message_id)
);

-- Message Reactions Table (for future emoji reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES team_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_reaction (message_id, user_id, reaction_type),
    INDEX idx_message_reactions (message_id)
);

-- Conversation Participants (for group messaging future support)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (conversation_id) REFERENCES team_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (conversation_id, user_id),
    INDEX idx_conversation_participants (conversation_id, is_active)
);

-- Update conversation last_message_at trigger
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER INSERT ON team_messages
FOR EACH ROW
BEGIN
    UPDATE team_conversations 
    SET last_message_at = NEW.created_at, updated_at = NOW()
    WHERE id = NEW.conversation_id;
END //
DELIMITER ;

-- Sample data for testing
INSERT IGNORE INTO team_conversations (user1_id, user2_id, created_at) VALUES
(1, 2, NOW() - INTERVAL 1 DAY),
(1, 3, NOW() - INTERVAL 2 HOURS),
(2, 3, NOW() - INTERVAL 30 MINUTES);

INSERT IGNORE INTO team_messages (conversation_id, sender_id, receiver_id, message, created_at) VALUES
(1, 1, 2, 'Hello! How are you feeling today?', NOW() - INTERVAL 1 DAY),
(1, 2, 1, 'Much better, thank you doctor!', NOW() - INTERVAL 23 HOURS),
(2, 3, 1, 'I have a question about my medication', NOW() - INTERVAL 2 HOURS),
(2, 1, 3, 'Of course, what would you like to know?', NOW() - INTERVAL 1 HOUR);

SELECT 'Messaging Schema Created Successfully!' as Status;