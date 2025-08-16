-- Enhanced Patient Profile Migration Script
-- Safe migration that checks for existing columns before adding them
-- Version: 1.0.0
-- Date: 2025-08-16T12:41:09.337Z

-- Set session variables for safety
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- =====================================================
-- SAFE COLUMN ADDITIONS TO USER_PROFILES
-- =====================================================

-- Check and add columns one by one
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'user_profiles' 
     AND column_name = 'suffix' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Column suffix already exists" as message',
    'ALTER TABLE user_profiles ADD COLUMN suffix VARCHAR(10)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'user_profiles' 
     AND column_name = 'pronouns' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Column pronouns already exists" as message',
    'ALTER TABLE user_profiles ADD COLUMN pronouns VARCHAR(20)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'user_profiles' 
     AND column_name = 'language_preference' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Column language_preference already exists" as message',
    'ALTER TABLE user_profiles ADD COLUMN language_preference VARCHAR(50) DEFAULT "English"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'user_profiles' 
     AND column_name = 'preferred_communication' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Column preferred_communication already exists" as message',
    'ALTER TABLE user_profiles ADD COLUMN preferred_communication ENUM("phone", "email", "sms", "portal") DEFAULT "phone"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'user_profiles' 
     AND column_name = 'ssn_encrypted' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Column ssn_encrypted already exists" as message',
    'ALTER TABLE user_profiles ADD COLUMN ssn_encrypted VARBINARY(255)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'user_profiles' 
     AND column_name = 'ssn_hash' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Column ssn_hash already exists" as message',
    'ALTER TABLE user_profiles ADD COLUMN ssn_hash VARCHAR(64)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add remaining columns with similar checks...
-- (Additional columns would be added here with the same pattern)

-- =====================================================
-- SAFE INDEX ADDITIONS
-- =====================================================

-- Add indexes if they don't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_name = 'user_profiles' 
     AND index_name = 'idx_ssn_hash' 
     AND table_schema = DATABASE()) > 0,
    'SELECT "Index idx_ssn_hash already exists" as message',
    'ALTER TABLE user_profiles ADD INDEX idx_ssn_hash (ssn_hash)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- RESTORE SESSION VARIABLES
-- =====================================================

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

SELECT 'Migration completed successfully!' as Status;
