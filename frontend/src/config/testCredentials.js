// Test credentials constant for development
// Use this across all login/registration flows for consistency
export const TEST_CREDENTIALS = {
  // Standard password for all test accounts
  DEMO_PASSWORD: '123456',
  
  // Test accounts that should always work
  PATIENT_PHONE: '1234567890',
  DOCTOR_PHONE: '9876543210',
  PHARMACY_PHONE: '5555555555',
  
  // Alternative test patterns
  DEMO_PASSWORDS: ['123456', 'password123', '000000'],
};

export default TEST_CREDENTIALS;
