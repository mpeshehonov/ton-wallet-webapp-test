import { Buffer } from 'buffer';

globalThis.Buffer = Buffer;
Object.assign(window, { Buffer });
