import { expect } from 'chai';
import { vi, beforeAll, describe, it } from 'vitest';

// Mock pdf-lib to avoid CJS resolution issues during tests
vi.mock('pdf-lib', () => {
  class MockPDFDocument {
    static async create() { return new MockPDFDocument(); }
    async copyPages() { return []; }
    addPage() {}
    async save() { return new Uint8Array([1]); }
    static async load() { return { getPageCount: () => 1, getPageIndices: () => [0] }; }
  }
  return { PDFDocument: MockPDFDocument };
});

// Import after mocks
let POST: any, GET: any;
beforeAll(async () => {
  const mod = await import('./route');
  POST = mod.POST;
  GET = mod.GET;
});

// Utility to build a File from bytes for Node tests
function makeFile(name: string, type: string, bytes: Uint8Array) {
  // @ts-expect-error Node 18+ has global File via undici; if not, route uses FormData.getAll typing only
  return new File([bytes], name, { type });
}

describe('PDF Merge API', () => {
  it('returns limits on GET', async () => {
    const res = await GET();
    expect(res.status).to.equal(200);
    const json = await res.json();
    expect(json).to.have.property('limits');
    expect(json.limits).to.have.property('maxFiles');
  });

  it('rejects when fewer than 2 files are provided', async () => {
    const form = new FormData();
    const req = new Request('http://localhost/api/pdf/merge', { method: 'POST', body: form as any });
    // @ts-ignore NextRequest compatible
    const res = await POST(req);
    expect(res.status).to.equal(400);
    const body = await res.json();
    expect(body.error).to.be.a('string');
  });

  it('rejects non-PDF files', async () => {
    const form = new FormData();
    const txt = makeFile('a.txt', 'text/plain', new Uint8Array([65]));
    const pdf = makeFile('a.pdf', 'application/pdf', new Uint8Array([37,80,68,70]));
    form.append('files', txt as any);
    form.append('files', pdf as any);
    const req = new Request('http://localhost/api/pdf/merge', { method: 'POST', body: form as any });
    // @ts-ignore NextRequest compatible
    const res = await POST(req);
    expect(res.status).to.equal(400);
    const body = await res.json();
    expect(body.error).to.exist;
  });
});


