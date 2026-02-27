export interface Chunk {
  text: string;
  startLine: number;
  endLine: number;
}

export interface ChunkerConfig {
  chunkSize: number;    // Target size in characters
  overlap: number;      // Overlap in characters
}

export class TextChunker {
  private config: ChunkerConfig;

  constructor(config: ChunkerConfig) {
    this.config = config;
  }

  chunk(text: string): Chunk[] {
    const lines = text.split('\n');
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let startLine = 1;
    let currentSize = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWithNewline = line + '\n';

      if (currentSize + lineWithNewline.length > this.config.chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.join(''),
          startLine: startLine,
          endLine: i
        });

        // Start new chunk with overlap
        const overlapLines = this.getOverlapLines(currentChunk);
        currentChunk = [...overlapLines, lineWithNewline];
        startLine = i - overlapLines.length + 1;
        currentSize = currentChunk.join('').length;
      } else {
        currentChunk.push(lineWithNewline);
        currentSize += lineWithNewline.length;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join(''),
        startLine: startLine,
        endLine: lines.length
      });
    }

    return chunks;
  }

  private getOverlapLines(chunk: string[]): string[] {
    const overlapSize = Math.min(this.config.overlap, chunk.length);
    return chunk.slice(-overlapSize);
  }
}
