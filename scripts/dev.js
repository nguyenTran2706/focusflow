const { spawn } = require('child_process');
const net = require('net');

const API_PORT = 3001;

/** Wait until a port is accepting connections. */
function waitForPort(port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const sock = net.createConnection({ port }, () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timed out waiting for port ${port}`));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
    };
    tryConnect();
  });
}

// 1. Start API
const api = spawn('npm', ['run', 'dev:api'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname + '/..',
});

// 2. Wait for API to be ready, then start Web
waitForPort(API_PORT)
  .then(() => {
    console.log('\n✅ API ready on http://localhost:' + API_PORT + '/api\n');
    const web = spawn('npm', ['run', 'dev:web'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname + '/..',
    });
    web.on('exit', (code) => process.exit(code ?? 0));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });

// Clean exit
process.on('SIGINT', () => {
  api.kill();
  process.exit(0);
});
