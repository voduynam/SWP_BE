require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const AppUser = require('../src/models/AppUser');
const Role = require('../src/models/Role');
const UserRole = require('../src/models/UserRole');
const OrgUnit = require('../src/models/OrgUnit');
const Location = require('../src/models/Location');

const seedDatabase = async () => {
  try {
    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing roles
    console.log('\n🔍 Checking existing data...');
    const existingRoles = await Role.find({});
    console.log(`   Found ${existingRoles.length} roles`);
    
    const existingAdmin = await AppUser.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('   ⚠️  Admin user already exists');
      console.log('\n✅ Database already seeded!');
      console.log('\n📝 Login credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      return;
    }

    // 1. Create Organization Unit (if not exists)
    console.log('\n🏢 Creating organization unit...');
    let orgUnit = await OrgUnit.findById('org_001');
    if (!orgUnit) {
      orgUnit = await OrgUnit.create({
        _id: 'org_001',
        type: 'STORE',
        code: 'STORE_MAIN',
        name: 'Main Store',
        address: '123 Main Street',
        district: 'District 1',
        city: 'Ho Chi Minh City',
        status: 'ACTIVE'
      });
      console.log('✅ Created org_unit: org_001');
    } else {
      console.log('   ℹ️  Org unit org_001 already exists');
    }

    // 2. Create Location (if not exists)
    console.log('\n📍 Creating location...');
    let location = await Location.findById('loc_001');
    if (!location) {
      location = await Location.create({
        _id: 'loc_001',
        org_unit_id: 'org_001',
        code: 'MAIN_WAREHOUSE',
        name: 'Main Warehouse',
        status: 'ACTIVE'
      });
      console.log('✅ Created location: loc_001');
    } else {
      console.log('   ℹ️  Location loc_001 already exists');
    }

    // 3. Create Admin User
    console.log('\n👤 Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const adminUser = await AppUser.create({
      _id: 'user_admin',
      org_unit_id: 'org_001',
      username: 'admin',
      password: hashedPassword,
      full_name: 'System Administrator',
      email: process.env.EMAIL_USER || 'admin@example.com',
      phone: '0123456789',
      status: 'ACTIVE',
      created_at: new Date()
    });
    console.log('✅ Created admin user');

    // 4. Assign Admin Role
    console.log('\n🔐 Assigning admin role...');
    await UserRole.create({
      user_id: 'user_admin',
      role_id: 'role_admin'
    });
    console.log('✅ Admin role assigned');

    // Summary
    console.log('\n✅ ========================================');
    console.log('✅ SEED DATABASE COMPLETED!');
    console.log('✅ ========================================');
    console.log('\n📝 Test credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email:', adminUser.email);
    console.log('\n📊 Available roles:');
    existingRoles.forEach(role => {
      console.log(`   - ${role.name} (${role.code})`);
    });
    console.log('\n🚀 Next steps:');
    console.log('   1. Start server: npm run dev');
    console.log('   2. Open Swagger: http://localhost:5001/api-docs');
    console.log('   3. Login with admin/admin123');
    console.log('   4. Test workflow!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    if (error.code === 11000) {
      console.error('   Duplicate key error - some data already exists');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
};

// Run seed
seedDatabase();
