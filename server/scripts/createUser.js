import 'dotenv/config';
import readline from 'node:readline';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { ROLES } from '../config/permissions.js';
import { hashPassword, validatePasswordStrength } from '../utils/password.js';
import { revokeUserSessions } from '../services/authService.js';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--reset-password') {
      args.resetPassword = true;
    } else if (token.startsWith('--')) {
      args[token.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) {
        rl.output.write(text);
      }
    };
    rl.question(question, (answer) => {
      rl.output.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || '').trim().toLowerCase();
  const name = String(args.name || '').trim();
  const role = String(args.role || '').trim().toUpperCase();

  if (!email || !ROLES.includes(role) || (!args.resetPassword && !name)) {
    console.error(`Usage: npm run user:create -- --email <email> --name "<name>" --role <${ROLES.join('|')}> [--reset-password]`);
    process.exitCode = 1;
    return;
  }

  const password = process.env.DASHBOARD_USER_PASSWORD || (await promptHidden('Password: '));
  const problem = validatePasswordStrength(password);

  if (problem) {
    console.error(problem);
    process.exitCode = 1;
    return;
  }

  await connectDB();

  const existing = await User.findOne({ email });
  const passwordHash = await hashPassword(password);

  if (existing && !args.resetPassword) {
    console.error('A user with this email already exists. Use --reset-password to change the password.');
    process.exitCode = 1;
    return;
  }

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.active = true;
    existing.failedLoginAttempts = 0;
    existing.lockUntil = null;
    await existing.save();
    await revokeUserSessions(existing._id);
    console.log(`Password updated for ${email}.`);
    return;
  }

  await User.create({ name, email, role, passwordHash });
  console.log(`Created ${role} user ${email}.`);
}

main()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
