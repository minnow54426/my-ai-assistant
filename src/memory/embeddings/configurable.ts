import { EmbeddingProvider } from './provider';

export interface ConfigurableConfig {
  apiKey: string;
  url: string;
  model: string;
  dimensions: number;
}

export class ConfigurableEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private url: string;
  private model: string;
  private dimensions: number;

  constructor(config: ConfigurableConfig) {
    this.apiKey = config.apiKey;
    this.url = config.url;
    this.model = config.model;
    this.dimensions = config.dimensions;
  }

  getModel(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.embed('test');
      return true;
    } catch {
      return false;
    }
  }

  async embed(text: string): Promise<Float32Array> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    return new Float32Array(data.embedding);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }
}
