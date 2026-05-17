// Load env from .env only if not already provided by the environment (e.g. Docker compose)
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}

// Entrypoint: bootstrap Nest application
import './nest/main';
