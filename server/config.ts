/**
 * Application configuration
 * Handles different environments: local, dev, qa, production
 */

type Environment = 'local' | 'dev' | 'qa' | 'production';

interface Config {
  apiUrl: string;
  corsOrigins: string[];
  s3: {
    bucket: string;
    region: string;
  };
  stripe: {
    webhookSecret?: string;
  };
  openai: {
    modelVersion: string;
  };
  session: {
    maxAge: number; // in milliseconds
  };
  scheduling: {
    enabled: boolean;
  };
}

// Default values for all environments
const defaultConfig: Config = {
  apiUrl: '/api',
  corsOrigins: ['*'],
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'healthtracker-uploads',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  openai: {
    modelVersion: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
  },
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },
  scheduling: {
    enabled: true,
  }
};

// Environment-specific configurations
const environmentConfigs: Record<Environment, Partial<Config>> = {
  local: {
    apiUrl: 'http://localhost:5000/api',
    corsOrigins: ['http://localhost:3000', 'http://localhost:5000'],
    scheduling: {
      enabled: false, // Disable scheduled tasks in local development
    }
  },
  dev: {
    apiUrl: 'https://dev-api.healthtracker.app/api',
    corsOrigins: ['https://dev.healthtracker.app'],
  },
  qa: {
    apiUrl: 'https://qa-api.healthtracker.app/api',
    corsOrigins: ['https://qa.healthtracker.app'],
  },
  production: {
    apiUrl: 'https://api.healthtracker.app/api',
    corsOrigins: ['https://healthtracker.app'],
    scheduling: {
      enabled: true,
    }
  }
};

// Determine current environment
function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  
  // Map NODE_ENV to our environment types
  if (env === 'development') return 'local';
  if (env === 'test') return 'qa';
  if (env === 'production') return 'production';
  
  // Allow explicit setting via ENV_NAME
  const explicitEnv = process.env.ENV_NAME as Environment;
  if (explicitEnv && ['local', 'dev', 'qa', 'production'].includes(explicitEnv)) {
    return explicitEnv;
  }
  
  // Default to local if nothing else matches
  return 'local';
}

// Create the configuration by merging default with environment-specific
const environment = getCurrentEnvironment();
const currentConfig: Config = {
  ...defaultConfig,
  ...environmentConfigs[environment],
};

// Log the current environment during startup
console.log(`Running in ${environment.toUpperCase()} environment`);

export { currentConfig as config, environment };