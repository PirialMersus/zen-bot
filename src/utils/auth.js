import crypto from 'node:crypto';

export const generateAuthCode = () => {
  const randomHexBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${randomHexBytes.slice(0, 4)}-${randomHexBytes.slice(4, 8)}`;
};
