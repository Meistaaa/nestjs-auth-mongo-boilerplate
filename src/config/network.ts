import { networkInterfaces } from 'node:os';

function getCurrentIpAddress() {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

export function getServerUrls(port: number) {
  const localhostUrl = `http://localhost:${port}`;
  const currentIp = getCurrentIpAddress();

  return {
    currentIp,
    localhostUrl,
    networkUrl: currentIp ? `http://${currentIp}:${port}` : null,
  };
}
