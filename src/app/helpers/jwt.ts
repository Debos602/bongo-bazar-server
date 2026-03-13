import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../../config';

const signToken = (payload: any, expiresIn?: string) => {
    const exp = expiresIn ?? config.jwt.expires_in ?? '1h';
    const opts: SignOptions = { algorithm: 'HS256', expiresIn: exp as unknown as any };
    return jwt.sign(payload, String(config.jwt.jwt_secret), opts);
};

const verifyToken = (token: string) => {
    return jwt.verify(token, String(config.jwt.jwt_secret));
};

export const authUtils = {
    signToken,
    verifyToken,
};

export default authUtils;
