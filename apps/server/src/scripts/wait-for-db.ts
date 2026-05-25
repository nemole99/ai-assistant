import net from "node:net";

const MAX_ATTEMPTS = 60;
const RETRY_DELAY_MS = 1000;
const SOCKET_TIMEOUT_MS = 3000;

function getDatabaseAddress(): { host: string; port: number } {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const parsed = new URL(databaseUrl);

  return {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || "5432", 10),
  };
}

async function canConnect(host: string, port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });

    const finish = (connected: boolean) => {
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { host, port } = getDatabaseAddress();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (await canConnect(host, port)) {
      console.log(`[wait-for-db] Database is reachable at ${host}:${port}`);
      return;
    }

    console.log(
      `[wait-for-db] Waiting for database at ${host}:${port} (${attempt}/${MAX_ATTEMPTS})`
    );

    await sleep(RETRY_DELAY_MS);
  }

  throw new Error(
    `Database at ${host}:${port} did not become reachable after ${MAX_ATTEMPTS} attempts`
  );
}

await main();
