import { expect } from 'chai';
import { vi, beforeEach, afterEach, describe, it } from 'vitest';
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      document: {
        update: vi.fn().mockResolvedValue({ id: '1', title: 't', content: '', status: 'draft', visibility: 'private', createdAt: new Date(), updatedAt: new Date() }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };
});
import { PATCH } from './route';
import { getServerSession } from 'next-auth';

describe('Documents API - item', () => {
  beforeEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'test-user', email: 't@t.com' } } as any);
  });

  afterEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('rejects invalid PATCH payload', async () => {
    const req = new Request('http://localhost/api/documents/1', { method: 'PATCH', body: JSON.stringify({ visibility: 'invalid' }) });
    // @ts-ignore NextRequest compatible
    const res = await PATCH(req, { params: { id: '1' } });
    expect(res.status).to.equal(400);
  });
});


