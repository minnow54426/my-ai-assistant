import { TextChunker } from './chunker';

describe('TextChunker', () => {
  it('should chunk text into pieces', () => {
    const chunker = new TextChunker({ chunkSize: 50, overlap: 10 });
    const text = 'Line 1\n'.repeat(20); // About 120 characters

    const chunks = chunker.chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeGreaterThan(0);
  });

  it('should preserve line numbers', () => {
    const chunker = new TextChunker({ chunkSize: 100, overlap: 20 });
    const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

    const chunks = chunker.chunk(text);

    chunks.forEach(chunk => {
      expect(chunk.startLine).toBeGreaterThanOrEqual(1);
      expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
    });
  });

  it('should handle overlap', () => {
    const chunker = new TextChunker({ chunkSize: 50, overlap: 20 });
    const text = 'A '.repeat(100); // 200 characters

    const chunks = chunker.chunk(text);

    if (chunks.length > 1) {
      // Second chunk should overlap with first
      const firstEnd = chunks[0].text.slice(-20);
      const secondStart = chunks[1].text.slice(0, 20);
      expect(firstEnd).toBe(secondStart);
    }
  });
});
