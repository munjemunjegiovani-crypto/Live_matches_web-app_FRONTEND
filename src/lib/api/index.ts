import { createHttpApi } from './http';
import { demoApi } from './demo';
import type { Api } from './types';

const base = process.env.NEXT_PUBLIC_API_URL;
export const api: Api = base ? createHttpApi(base) : demoApi;
export const API_BASE = base ?? '';
export * from './types';
