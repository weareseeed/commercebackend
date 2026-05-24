import { buildApp } from './app';
import { env } from './env';

const app = buildApp();

const start = async () => {
  try {
    const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`CommerceBackend API running at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
