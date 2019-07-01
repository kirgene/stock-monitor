import { IEX } from './IEX';
import { Test } from './Test';

const providers = [
  'IEX',
  'TEST',
];

export function getSupportedProviders() {
  return [...providers]; // clone array of providers
}

export function getProvider(name: string) {
  switch (name) {
    case 'IEX':
      return IEX;
    case 'TEST':
      return Test;
    default:
      return null;
  }
}
