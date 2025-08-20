import { expect } from 'chai';
import { vi, beforeEach, afterEach, describe, it } from 'vitest';
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      document: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: '1', title: 't', content: '', status: 'draft', visibility: 'private', createdAt: new Date(), updatedAt: new Date() }),
      },
    },
  };
});
import { GET, POST } from './route';

// Mock getServerSession used in route handlers by monkey-patching globalThis
import { getServerSession } from 'next-auth';

describe('Documents API - collection', () => {
  beforeEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'test-user', email: 't@t.com' } } as any);
  });

  afterEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('rejects unauthenticated', async () => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null as any);
    const req = new Request('http://localhost/api/documents');
    // @ts-ignore NextRequest compatible
    const res = await GET(req);
    expect(res.status).to.equal(401);
  });

  it('validates POST payload', async () => {
    const req = new Request('http://localhost/api/documents', { method: 'POST', body: JSON.stringify({}) });
    // @ts-ignore NextRequest compatible
    const res = await POST(req);
    expect(res.status).to.equal(400);
  });
});


