export interface EmbeddingProvider {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  getModel(): string;
  getDimensions(): number;
  isAvailable(): Promise<boolean>;
}
