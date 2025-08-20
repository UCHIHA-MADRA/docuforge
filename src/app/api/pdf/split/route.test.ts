import { expect } from 'chai';
import { vi, beforeAll, describe, it } from 'vitest';

// Mock pdf-lib
vi.mock('pdf-lib', () => {
  class MockPDFDocument {
    static async create() { return new MockPDFDocument(); }
    static async load() { return { getPageCount: () => 10 }; }
    async copyPages(_src: any, indices: number[]) { return indices.map(() => ({})); }
    addPage() {}
    async save() { return new Uint8Array([1,2,3]); }
  }
  return { PDFDocument: MockPDFDocument };
});

let POST: any, GET: any;
beforeAll(async () => {
  const mod = await import('./route');
  POST = mod.POST;
  GET = mod.GET;
});

describe('PDF Split API', () => {
  it('returns limits on GET', async () => {
    const res = await GET();
    expect(res.status).to.equal(200);
    const json = await res.json();
    expect(json.limits).to.have.property('maxPagesToExtract');
  });

  it('rejects missing file', async () => {
    const form = new FormData();
    const req = new Request('http://localhost/api/pdf/split', { method: 'POST', body: form as any });
    // @ts-ignore NextRequest compatible
    const res = await POST(req);
    expect(res.status).to.equal(400);
  });

  it('rejects when pages spec missing', async () => {
    const form = new FormData();
    // @ts-ignore
    form.append('file', new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }));
    const req = new Request('http://localhost/api/pdf/split', { method: 'POST', body: form as any });
    // @ts-ignore NextRequest compatible
    const res = await POST(req);
    expect(res.status).to.equal(400);
  });
});


