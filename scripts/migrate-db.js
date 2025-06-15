#!/usr/bin/env node
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

/**
 * This script handles database migrations for serverless environments.
 * It can be run as part of the SST deployment process.
 */
async function main() {
  console.log('Starting database migration process...');
  
  try {
    // Run Prisma migrations
    console.log('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Verify database connection
    console.log('Verifying database connection...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('Database connection successful!');
    await prisma.$disconnect();
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during database migration:', error);
    process.exit(1);
  }
}

main();
