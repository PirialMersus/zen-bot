import crypto from 'node:crypto';

export const generateAuthCode = () => {
  const randomHexBytes = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${randomHexBytes.slice(0, 3)}-${randomHexBytes.slice(3, 6)}`;
};
