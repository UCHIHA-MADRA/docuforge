import { expect } from 'chai';
import { vi, beforeAll, describe, it } from 'vitest';

// Mock sharp to avoid native dependency during tests
vi.mock('sharp', () => {
  return {
    default: (input: Buffer) => ({
      resize: (_opts: any) => ({
        jpeg: (_opts: any) => ({ toBuffer: async () => Buffer.from([1,2]) }),
        png: (_opts: any) => ({ toBuffer: async () => Buffer.from([1,2]) }),
        webp: (_opts: any) => ({ toBuffer: async () => Buffer.from([1,2]) }),
        avif: (_opts: any) => ({ toBuffer: async () => Buffer.from([1,2]) }),
        toBuffer: async () => Buffer.from([1,2]),
      }),
      jpeg: (_opts: any) => ({ toBuffer: async () => Buffer.from([1,2]) }),
      toBuffer: async () => Buffer.from([1,2]),
    }),
  };
});

let POST: any, GET: any;
beforeAll(async () => {
  const mod = await import('./route');
  POST = mod.POST;
  GET = mod.GET;
});

describe('Image Resize API', () => {
  it('returns limits on GET', async () => {
    const res = await GET();
    expect(res.status).to.equal(200);
  });

  it('rejects unsupported type', async () => {
    const form = new FormData();
    // @ts-ignore
    form.append('file', new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' }));
    const req = new Request('http://localhost/api/images/resize', { method: 'POST', body: form as any });
    // @ts-ignore
    const res = await POST(req);
    expect(res.status).to.equal(400);
  });

  it('resizes jpeg', async () => {
    const form = new FormData();
    // @ts-ignore
    form.append('file', new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }));
    form.append('width', '100');
    form.append('format', 'jpeg');
    const req = new Request('http://localhost/api/images/resize', { method: 'POST', body: form as any });
    // @ts-ignore
    const res = await POST(req);
    expect(res.status).to.equal(200);
    expect(res.headers.get('content-type')).to.match(/image\/jpeg/);
  });
});


