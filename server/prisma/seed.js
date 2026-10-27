import '../src/config/env.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'DemoPass123!';

async function main() {
  console.log('--- Starting MealRelay Seed Script ---');

  if (process.env.NODE_ENV === 'production') {
    console.warn('WARNING: Running seed script in production environment. Aborting for safety.');
    return;
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Create or update Approved Donor Organization
  const donorOrg = await prisma.organization.upsert({
    where: { id: 'demo-org-donor-1' },
    update: {
      name: 'Green Bites Cafe & Mess',
      type: 'DONOR',
      approvalStatus: 'APPROVED',
      address: '101 Market Street',
      locality: 'Downtown'
    },
    create: {
      id: 'demo-org-donor-1',
      name: 'Green Bites Cafe & Mess',
      type: 'DONOR',
      approvalStatus: 'APPROVED',
      address: '101 Market Street',
      locality: 'Downtown'
    }
  });

  // Approved Donor User
  const donorUser = await prisma.user.upsert({
    where: { email: 'donor@demo.org' },
    update: {
      name: 'David Donor',
      passwordHash: hashedPassword,
      role: 'DONOR'
    },
    create: {
      id: 'demo-user-donor-1',
      name: 'David Donor',
      email: 'donor@demo.org',
      passwordHash: hashedPassword,
      role: 'DONOR'
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: donorUser.id,
        organizationId: donorOrg.id
      }
    },
    update: { membershipRole: 'OWNER' },
    create: {
      userId: donorUser.id,
      organizationId: donorOrg.id,
      membershipRole: 'OWNER'
    }
  });

  // 2. Create or update Pending NGO
  const pendingNgoOrg = await prisma.organization.upsert({
    where: { id: 'demo-org-ngo-pending' },
    update: {
      name: 'Hope Shelter Network',
      type: 'NGO',
      approvalStatus: 'PENDING',
      address: '220 Elm Avenue',
      locality: 'Uptown'
    },
    create: {
      id: 'demo-org-ngo-pending',
      name: 'Hope Shelter Network',
      type: 'NGO',
      approvalStatus: 'PENDING',
      address: '220 Elm Avenue',
      locality: 'Uptown'
    }
  });

  const pendingNgoUser = await prisma.user.upsert({
    where: { email: 'pending.ngo@demo.org' },
    update: {
      name: 'Peter Pending',
      passwordHash: hashedPassword,
      role: 'NGO'
    },
    create: {
      id: 'demo-user-ngo-pending',
      name: 'Peter Pending',
      email: 'pending.ngo@demo.org',
      passwordHash: hashedPassword,
      role: 'NGO'
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: pendingNgoUser.id,
        organizationId: pendingNgoOrg.id
      }
    },
    update: { membershipRole: 'OWNER' },
    create: {
      userId: pendingNgoUser.id,
      organizationId: pendingNgoOrg.id,
      membershipRole: 'OWNER'
    }
  });

  // 3. Create or update Approved NGO
  const approvedNgoOrg = await prisma.organization.upsert({
    where: { id: 'demo-org-ngo-approved' },
    update: {
      name: 'Community Harvest Trust',
      type: 'NGO',
      approvalStatus: 'APPROVED',
      address: '45 Care Lane',
      locality: 'Midtown'
    },
    create: {
      id: 'demo-org-ngo-approved',
      name: 'Community Harvest Trust',
      type: 'NGO',
      approvalStatus: 'APPROVED',
      address: '45 Care Lane',
      locality: 'Midtown'
    }
  });

  const approvedNgoUser = await prisma.user.upsert({
    where: { email: 'ngo@demo.org' },
    update: {
      name: 'Alice NGO',
      passwordHash: hashedPassword,
      role: 'NGO'
    },
    create: {
      id: 'demo-user-ngo-approved',
      name: 'Alice NGO',
      email: 'ngo@demo.org',
      passwordHash: hashedPassword,
      role: 'NGO'
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: approvedNgoUser.id,
        organizationId: approvedNgoOrg.id
      }
    },
    update: { membershipRole: 'OWNER' },
    create: {
      userId: approvedNgoUser.id,
      organizationId: approvedNgoOrg.id,
      membershipRole: 'OWNER'
    }
  });

  // 4. Create or update Administrator
  const adminOrg = await prisma.organization.upsert({
    where: { id: 'demo-org-admin' },
    update: {
      name: 'MealRelay Operational Hub',
      type: 'NGO',
      approvalStatus: 'APPROVED',
      address: '1 Relief Plaza',
      locality: 'Central'
    },
    create: {
      id: 'demo-org-admin',
      name: 'MealRelay Operational Hub',
      type: 'NGO',
      approvalStatus: 'APPROVED',
      address: '1 Relief Plaza',
      locality: 'Central'
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.org' },
    update: {
      name: 'System Administrator',
      passwordHash: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      id: 'demo-user-admin',
      name: 'System Administrator',
      email: 'admin@demo.org',
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: adminOrg.id
      }
    },
    update: { membershipRole: 'OWNER' },
    create: {
      userId: adminUser.id,
      organizationId: adminOrg.id,
      membershipRole: 'OWNER'
    }
  });

  // 5. Seed sample OPEN donations for Approved Donor
  const now = new Date();
  const sampleDonations = [
    {
      id: 'demo-donation-1',
      title: 'Fresh Veggie Pulao & Lentil Curry Trays',
      description: 'Prepared for a corporate luncheon. Packed securely in food-grade aluminum trays, kept in hot-holding.',
      quantity: 50,
      unit: 'meals',
      foodType: 'VEGETARIAN',
      preparedAt: new Date(now.getTime() - 2 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 5 * 3600 * 1000),
      consumeBy: new Date(now.getTime() + 12 * 3600 * 1000)
    },
    {
      id: 'demo-donation-2',
      title: 'Artisan Sourdough & Croissant Assortment',
      description: 'Daily surplus bakery goods baked this morning. Sealed in bakery paper bags, perfectly fresh and dry.',
      quantity: 35,
      unit: 'portions',
      foodType: 'VEGETARIAN',
      preparedAt: new Date(now.getTime() - 4 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 8 * 3600 * 1000),
      consumeBy: new Date(now.getTime() + 24 * 3600 * 1000)
    },
    {
      id: 'demo-donation-3',
      title: 'Grilled Herb Chicken with Steamed Greens',
      description: 'Surplus dinner banquet portions. Stored in temperature-controlled refrigeration at 4°C.',
      quantity: 30,
      unit: 'servings',
      foodType: 'NON_VEGETARIAN',
      preparedAt: new Date(now.getTime() - 1 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 4 * 3600 * 1000),
      consumeBy: new Date(now.getTime() + 10 * 3600 * 1000)
    },
    {
      id: 'demo-donation-4',
      title: 'Mixed Seasonal Fruit Crates (Apples & Oranges)',
      description: 'Fresh cafeteria fruits, unpeeled and undamaged. Packed in ventilated wooden crates ready for collection.',
      quantity: 25,
      unit: 'kg',
      foodType: 'OTHER',
      preparedAt: new Date(now.getTime() - 6 * 3600 * 1000),
      pickupDeadline: new Date(now.getTime() + 18 * 3600 * 1000),
      consumeBy: new Date(now.getTime() + 36 * 3600 * 1000)
    }
  ];

  for (const item of sampleDonations) {
    await prisma.donation.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        foodType: item.foodType,
        preparedAt: item.preparedAt,
        pickupDeadline: item.pickupDeadline,
        consumeBy: item.consumeBy,
        status: 'OPEN',
        donorOrganizationId: donorOrg.id
      },
      create: {
        id: item.id,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        foodType: item.foodType,
        preparedAt: item.preparedAt,
        pickupDeadline: item.pickupDeadline,
        consumeBy: item.consumeBy,
        status: 'OPEN',
        donorOrganizationId: donorOrg.id
      }
    });
  }

  console.log('Seed completed successfully:');
  console.log('1. Approved Donor: donor@demo.org');
  console.log('2. Pending NGO: pending.ngo@demo.org');
  console.log('3. Approved NGO: ngo@demo.org');
  console.log('4. Administrator: admin@demo.org');
  console.log('Default demo password:', DEMO_PASSWORD);
  console.log('4 sample donations created.');
}

main()
  .catch((e) => {
    console.error('Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
