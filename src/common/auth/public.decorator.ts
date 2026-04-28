import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'wdc:isPublic';

/** Marks a controller or handler as not requiring an access token. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
