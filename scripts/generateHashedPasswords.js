const bcrypt = require('bcryptjs');

/**
 * Script to generate bcrypt hashed passwords for masterData.txt
 * Run: node scripts/generateHashedPasswords.js
 */

const passwords = [
  { username: 'admin', plainPassword: 'admin123' },
  { username: 'chef_tuan', plainPassword: 'chef123' },
  { username: 'staff_lan', plainPassword: 'staff123' }
];

async function generateHashes() {
  console.log('=== Generating Bcrypt Hashed Passwords ===\n');
  
  for (const user of passwords) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.plainPassword, salt);
    
    console.log(`Username: ${user.username}`);
    console.log(`Plain Password: ${user.plainPassword}`);
    console.log(`Hashed Password: ${hashedPassword}`);
    console.log('---\n');
  }
  
  console.log('=== Copy these hashed passwords to masterData.txt ===');
}

generateHashes().catch(console.error);
