import * as bcrypt from 'bcryptjs';
import config from '../../config';

export const hashPassword = async (plain: string) => {
    const rounds = Number(config.salt_round) || 10;
    return bcrypt.hash(plain, rounds);
};

export const comparePassword = async (plain: string, hashed: string) => {
    return bcrypt.compare(plain, hashed);
};

export default {
    hashPassword,
    comparePassword,
};
