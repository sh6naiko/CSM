const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getPhpExecutable() {
  // 1. Check if 'php' is accessible in PATH
  try {
    const cmd = process.platform === 'win32' ? 'where php' : 'which php';
    const result = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split(/[\r\n]+/)[0];
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch (e) {}

  // 2. Fallbacks for Windows (e.g. XAMPP, Laragon)
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\xampp\\php\\php.exe',
      'D:\\xampp\\php\\php.exe',
      'C:\\laragon\\bin\\php\\php.exe',
      'C:\\tools\\php\\php.exe'
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  return 'php';
}

const isTest = process.argv.includes('--test');
const phpBin = getPhpExecutable();
let mailerChild = null;

if (isTest) {
  const child = spawn(phpBin, ['tests/api-smoke.php'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  startServer().catch(error => {
    console.error('[ERROR] Frontend build failed:', error.message);
    process.exit(1);
  });
}

async function startServer() {
  const { buildFrontend } = require('./scripts/build-frontend.cjs');
  const frontend = await buildFrontend({ watch: true });
  const mailerEnv = path.join(__dirname, 'mailer', '.env');
  if (fs.existsSync(mailerEnv)) {
    console.log('Starting the local Nodemailer recovery service ...');
    mailerChild = spawn(process.execPath, ['mailer/server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      windowsHide: true,
    });
    mailerChild.on('error', (err) => {
      console.error('[WARNING] Nodemailer service could not start:', err.message);
      mailerChild = null;
    });
    mailerChild.on('exit', (code) => {
      if (code && code !== 0) console.error(`[WARNING] Nodemailer service exited with code ${code}.`);
      mailerChild = null;
    });
  } else {
    console.log('[INFO] mailer/.env is missing; password-recovery email is unavailable.');
  }
  const args = [
    '-d', 'upload_max_filesize=10M',
    '-d', 'post_max_size=12M',
    '-S', '127.0.0.1:8080',
    'router.php'
  ];

  console.log('========================================================');
  console.log('   Co-StudyMaxx Development Server');
  console.log('========================================================');
  console.log(`Using PHP: ${phpBin}`);
  console.log('Starting server on http://127.0.0.1:8080 ...\n');

  const child = spawn(phpBin, args, { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error('\n[ERROR] Failed to start PHP server:', err.message);
    console.error('Please ensure PHP or XAMPP is installed at C:\\xampp\\php\\php.exe\n');
    if (mailerChild) mailerChild.kill();
    frontend.dispose();
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (mailerChild) mailerChild.kill();
    frontend.dispose();
    process.exit(code ?? 0);
  });

  const stop = () => {
    child.kill();
    if (mailerChild) mailerChild.kill();
    frontend.dispose();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
