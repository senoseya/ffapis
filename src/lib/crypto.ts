import crypto from 'crypto';
import { AE } from './constants';

export function encrypt(buffer: Buffer): Buffer {
  const cipher = crypto.createCipheriv('aes-128-cbc', AE.MAIN_KEY, AE.MAIN_IV);
  return Buffer.concat([cipher.update(buffer), cipher.final()]);
}
