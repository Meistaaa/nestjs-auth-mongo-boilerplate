import { Throttle, minutes } from '@nestjs/throttler';

export function AuthThrottle() {
  return Throttle({
    default: {
      ttl: minutes(1),
      limit: 5,
    },
  });
}
