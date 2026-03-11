import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type SponsorJwtSubject = {
  sponsorId: string;
  tier: string;
  isSponsor: true;
};

type SponsorJwtPayload = {
  sub: string;
  tier: string;
  isSponsor: boolean;
};

@Injectable()
export class SponsorJwtStrategy extends PassportStrategy(Strategy, 'sponsor-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: SponsorJwtPayload): Promise<SponsorJwtSubject | null> {
    if (!payload.isSponsor) return null;
    return {
      sponsorId: payload.sub,
      tier: payload.tier,
      isSponsor: true,
    };
  }
}
