import { expect } from 'chai';
import { vi, beforeEach, afterEach, describe, it } from 'vitest';
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { file: { findMany: vi.fn().mockResolvedValue([]) } } }));
import { GET } from './route';
import { getServerSession } from 'next-auth';

describe('Files API - list', () => {
  beforeEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } } as any);
  });
  afterEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null as any);
    // @ts-ignore
    const res = await GET(new Request('http://localhost/api/files'));
    expect(res.status).to.equal(401);
  });

  it('returns list', async () => {
    // @ts-ignore
    const res = await GET(new Request('http://localhost/api/files'));
    expect(res.status).to.equal(200);
    const json = await res.json();
    expect(json).to.have.property('files');
  });
});


