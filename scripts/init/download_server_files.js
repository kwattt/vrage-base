// check the current OS, if its linux launch ./ragemp_server_linux.sh, if its windows launch ./ragemp_server_windows.ps1

const { exec } = require('child_process');
const os = require('os');

if (os.platform() === 'linux') {
    exec('./scripts/init/ragemp_server_linux.sh', (err, stdout, stdsierr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
}

if (os.platform() === 'win32') {
    exec('powershell -ExecutionPolicy Bypass -File scripts\\init\\ragemp_server_windows.ps1', (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
}