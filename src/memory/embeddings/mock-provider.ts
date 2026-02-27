import { EmbeddingProvider } from './provider';

export class MockEmbeddingProvider implements EmbeddingProvider {
  getModel(): string {
    return 'mock-model';
  }

  getDimensions(): number {
    return 3;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async embed(text: string): Promise<Float32Array> {
    // Generate deterministic mock embedding based on text
    const hash = this.simpleHash(text);
    return new Float32Array([hash % 100 / 100, (hash * 2) % 100 / 100, (hash * 3) % 100 / 100]);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
