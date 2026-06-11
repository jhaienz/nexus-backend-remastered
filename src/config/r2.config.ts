import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.R2_ACCOUNT_ID ?? '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  bucketName: process.env.R2_BUCKET_NAME ?? 'ncf-research-files',
  publicUrl: process.env.R2_PUBLIC_URL ?? '',
  pdfsPrefix: process.env.R2_PDFS_PREFIX ?? 'pdfs',
  profilesPrefix: process.env.R2_PROFILES_PREFIX ?? 'profiles',
}));
