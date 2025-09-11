# Implementation Plan

- [ ] 1. Create utility functions for safe data formatting
  - Implement `formatAmount()` function with null checking and NaN handling
  - Implement `formatPatientName()` function for safe name concatenation
  - Create `validateClaimData()` function for data integrity checks
  - Write unit tests for all utility functions
  - _Requirements: 1.1, 1.3, 2.1_

- [ ] 2. Update SQL queries to handle null values properly
  - Replace `SUM(total_amount)` with `COALESCE(SUM(total_amount), 0)` in status summary query
  - Add `IFNULL()` functions for patient name concatenation in JOIN queries
  - Update recent claims query to handle missing patient data gracefully
  - Add default values for all nullable columns in INSERT statements
  - _Requirements: 1.1, 1.2, 2.2, 2.3_

- [ ] 3. Enhance JavaScript data processing in setup scripts
  - Update `server/setup-dummy-claims-data.js` to use safe formatting functions
  - Replace all `parseFloat()` calls with null-checked versions
  - Add validation for database query results before processing
  - Implement error handling for individual record processing failures
  - _Requirements: 1.3, 2.1, 3.1, 3.3_

- [ ] 4. Fix root-level setup script data handling
  - Update `setup-dummy-claims-data.js` to use safe formatting functions
  - Add null checking for SQL execution results
  - Implement proper error handling for missing or corrupted data
  - Ensure consistent output formatting across all display functions
  - _Requirements: 1.1, 1.3, 2.1, 3.2_

- [ ] 5. Enhance SQL file with robust data insertion
  - Update `server/sql/add_dummy_claims_data.sql` with COALESCE functions
  - Add validation constraints to prevent null amounts in billings table
  - Ensure all INSERT statements have proper default values
  - Add data integrity checks in the summary queries at the end
  - _Requirements: 1.2, 4.1, 4.2, 4.3_

- [ ] 6. Implement comprehensive error handling and logging
  - Add specific error messages for different types of data validation failures
  - Implement retry logic for transient database connection issues
  - Create detailed logging for debugging data setup issues
  - Add graceful degradation when optional operations fail
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Create data validation and verification functions
  - Implement pre-setup validation to check database schema
  - Add post-setup verification to ensure data integrity
  - Create functions to validate monetary amounts and date ranges
  - Implement checks for required fields in patient profiles
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Write comprehensive tests for the validation fixes
  - Create unit tests for all utility functions with edge cases
  - Write integration tests for complete data setup scenarios
  - Test error handling with various failure conditions
  - Validate that no NaN values appear in any output displays
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.3_