import CryptoJS from 'crypto-js';

const SECRET = 'instaurl-secure-2024-key';

// Encrypt any value as a string
export const encryptVal = (val: any): string => {
  if (val === undefined || val === null) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return CryptoJS.AES.encrypt(str, SECRET).toString();
};

// Decrypt a string back to original type
export const decryptVal = (ciphertext: string): any => {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET);
  const str = bytes.toString(CryptoJS.enc.Utf8);
  try { return JSON.parse(str); } catch { return str; }
};

// Encrypt all fields in an object
export const encryptObj = (obj: any): any => {
  const enc: any = {};
  for (const k in obj) enc[k] = encryptVal(obj[k]);
  return enc;
};

// Decrypt all fields in an object
export const decryptObj = (obj: any): any => {
  const dec: any = {};
  for (const k in obj) dec[k] = decryptVal(obj[k]);
  return dec;
};
