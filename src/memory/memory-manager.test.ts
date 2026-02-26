import { MemoryManager } from './memory-manager';
import { MemoryConfig, ConversationMessage } from './types';
import { GLMClient } from '../llm/glm';

describe('MemoryManager', () => {
  let mockLLMClient: jest.Mocked<GLMClient>;
  let config: MemoryConfig;

  beforeEach(() => {
    mockLLMClient = {
      sendMessage: jest.fn().mockResolvedValue({ content: 'Test summary' })
    } as any;

    config = {
      storagePath: '/tmp/test-memory.json',
      maxRecentMessages: 15,
      summarizeAfter: 20,
      maxSummaries: 50
    };

    // Clean up test file
    if (require('fs').existsSync(config.storagePath)) {
      require('fs').unlinkSync(config.storagePath);
    }
  });

  describe('Constructor', () => {
    it('creates new memory if file does not exist', () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const stats = manager.getStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.recentCount).toBe(0);
      expect(stats.summaryCount).toBe(0);
    });
  });

  describe('addMessage', () => {
    it('adds message to recent messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await manager.addMessage(message);

      const stats = manager.getStats();
      expect(stats.recentCount).toBe(1);
      expect(stats.totalMessages).toBe(1);
    });

    it('saves memory to disk after adding message', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await manager.addMessage(message);

      const fs = require('fs');
      expect(fs.existsSync(config.storagePath)).toBe(true);
    });

    it('increments total messages processed', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await manager.addMessage(message);
      await manager.addMessage({ ...message, content: 'Hello again' });

      const stats = manager.getStats();
      expect(stats.totalMessages).toBe(2);
    });
  });

  describe('getContext', () => {
    it('returns empty context when no messages', () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const context = manager.getContext();

      expect(context).toContain('Previous topics discussed');
      expect(context).toContain('(none)');
      expect(context).toContain('Recent conversation');
    });

    it('includes recent messages in context', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      await manager.addMessage({
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      const context = manager.getContext();
      expect(context).toContain('Test message');
    });
  });

  describe('getStats', () => {
    it('returns accurate statistics', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      await manager.addMessage({
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      });

      const stats = manager.getStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.recentCount).toBe(1);
      expect(stats.summaryCount).toBe(0);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });
});
