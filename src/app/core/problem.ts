import { HttpErrorResponse } from '@angular/common/http';

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export class CarriedProblem extends Error {
  constructor(readonly problem: ApiProblem) {
    super(problem.detail);
  }
}

export function problemFrom(error: unknown): ApiProblem {
  if (error instanceof CarriedProblem) {
    return error.problem;
  }
  if (error instanceof HttpErrorResponse) {
    const body = readBody(error.error);
    const status = typeof body.status === 'number' ? body.status : error.status;
    return {
      type: body.type ?? '',
      title: body.title ?? fallbackTitle(status),
      status,
      detail: body.detail ?? fallbackDetail(status),
    };
  }
  if (error instanceof Error && error.message === 'Sign in required') {
    return {
      type: 'https://quickbank.dev/problems/unauthorized',
      title: 'Sign in required',
      status: 401,
      detail: 'Send Authorization: Bearer with a QuickBank access token.',
    };
  }
  return {
    type: '',
    title: 'API unreachable',
    status: 0,
    detail: 'QuickBank could not reach the API. Check that the stack is up on port 8088.',
  };
}

export function isNoAccount(problem: ApiProblem): boolean {
  return problem.status === 404 && problem.type.endsWith('/not-found');
}

function readBody(value: unknown): { type?: string; title?: string; status?: number; detail?: string } {
  if (typeof value === 'string') {
    try {
      return readBody(JSON.parse(value) as unknown);
    } catch {
      return value.trim() === '' ? {} : { detail: value };
    }
  }
  if (!value || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    type: typeof record['type'] === 'string' ? record['type'] : undefined,
    title: typeof record['title'] === 'string' ? record['title'] : undefined,
    status: typeof record['status'] === 'number' ? record['status'] : undefined,
    detail: typeof record['detail'] === 'string' ? record['detail'] : undefined,
  };
}

function fallbackTitle(status: number): string {
  if (status === 401) {
    return 'Sign in required';
  }
  if (status === 403) {
    return 'Missing CLIENT role';
  }
  if (status === 0) {
    return 'API unreachable';
  }
  return 'Request failed';
}

function fallbackDetail(status: number): string {
  if (status === 0) {
    return 'QuickBank could not reach the API. Check that the stack is up on port 8088.';
  }
  return 'QuickBank could not complete that request.';
}
