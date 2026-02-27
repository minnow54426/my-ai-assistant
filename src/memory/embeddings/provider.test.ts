import { MockEmbeddingProvider } from './mock-provider';

describe('EmbeddingProvider', () => {
  it('should generate single embedding', async () => {
    const provider = new MockEmbeddingProvider();

    const embedding = await provider.embed('test text');

    expect(embedding).toBeInstanceOf(Float32Array);
    expect(embedding.length).toBe(3); // Mock dimension
  });

  it('should generate batch embeddings', async () => {
    const provider = new MockEmbeddingProvider();

    const embeddings = await provider.embedBatch(['text1', 'text2']);

    expect(embeddings.length).toBe(2);
    expect(embeddings[0]).toBeInstanceOf(Float32Array);
  });

  it('should return model info', () => {
    const provider = new MockEmbeddingProvider();

    expect(provider.getModel()).toBe('mock-model');
    expect(provider.getDimensions()).toBe(3);
  });
});
