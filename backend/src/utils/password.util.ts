import bcrypt from "bcrypt";

const parsedRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const SALT_ROUNDS = Number.isInteger(parsedRounds) && parsedRounds > 0 ? parsedRounds : 12;

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, passwordHash);
};
