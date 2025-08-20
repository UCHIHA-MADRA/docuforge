import { expect } from 'chai';
import { vi, beforeEach, afterEach, describe, it } from 'vitest';
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { file: { create: vi.fn().mockResolvedValue({ id: 'f1', originalName: 'a.pdf', mimeType: 'application/pdf', size: 10, uploadedAt: new Date() }) } } }));
import { POST } from './route';
import { getServerSession } from 'next-auth';

describe('Files API - upload', () => {
  beforeEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } } as any);
  });
  afterEach(() => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('rejects no file', async () => {
    const form = new FormData();
    const req = new Request('http://localhost/api/files/upload', { method: 'POST', body: form as any });
    // @ts-ignore
    const res = await POST(req);
    expect(res.status).to.equal(400);
  });

  it('accepts small file', async () => {
    const form = new FormData();
    // @ts-ignore
    form.append('file', new File([new Uint8Array([1])], 'a.txt', { type: 'text/plain' }));
    const req = new Request('http://localhost/api/files/upload', { method: 'POST', body: form as any });
    // @ts-ignore
    const res = await POST(req);
    expect(res.status).to.equal(201);
  });
});


