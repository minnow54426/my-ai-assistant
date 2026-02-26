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

  afterEach(() => {
    // Clean up test file after each test
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

  describe('Summarization', () => {
    it('triggers summarization after 20 messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      // Add 20 messages
      for (let i = 0; i < 20; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBeGreaterThan(0);
      expect(stats.recentCount).toBeLessThanOrEqual(15);
    });

    it('summarizes oldest 10 messages', async () => {
      const manager = new MemoryManager(config, mockLLMClient);

      // Add 15 messages to fill recent messages
      for (let i = 0; i < 15; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      // Add 5 more to trigger summarization (20 total)
      for (let i = 15; i < 20; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBe(1);
      expect(stats.recentCount).toBe(10); // 15 - 10 summarized + 5 new

      // Verify summary was created with correct message count
      const context = manager.getContext();
      expect(context).toContain('Test summary');
    });

    it('prunes summaries when exceeding maxSummaries', async () => {
      const smallConfig = { ...config, maxSummaries: 3 };
      const manager = new MemoryManager(smallConfig, mockLLMClient);

      // Add enough messages to create 4 summaries (20 * 4 = 80 messages)
      for (let i = 0; i < 80; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      expect(stats.summaryCount).toBe(3); // Pruned to maxSummaries
    });

    it('handles summarization failure gracefully', async () => {
      const failingClient = {
        sendMessage: jest.fn().mockRejectedValue(new Error('API error'))
      } as any;

      const manager = new MemoryManager(config, failingClient);

      // Add 20 messages to trigger summarization
      for (let i = 0; i < 20; i++) {
        await manager.addMessage({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const stats = manager.getStats();
      // Messages should be kept, not lost
      expect(stats.recentCount).toBe(20);
    });
  });

  describe('Persistence', () => {
    it('saves memory to disk after each addMessage', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const fs = require('fs');

      await manager.addMessage({
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      expect(fs.existsSync(config.storagePath)).toBe(true);
    });

    it('loads existing memory from disk', async () => {
      const fs = require('fs');

      // Create first manager and add message
      const manager1 = new MemoryManager(config, mockLLMClient);
      await manager1.addMessage({
        role: 'user',
        content: 'Persistent message',
        timestamp: new Date('2026-02-26T10:00:00.000Z')
      });

      // Create second manager with same config
      const manager2 = new MemoryManager(config, mockLLMClient);
      const stats = manager2.getStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.recentCount).toBe(1);

      const context = manager2.getContext();
      expect(context).toContain('Persistent message');
    });

    it('handles corrupted file gracefully', async () => {
      const fs = require('fs');

      // Write invalid JSON
      fs.writeFileSync(config.storagePath, 'invalid json');

      const manager = new MemoryManager(config, mockLLMClient);
      const stats = manager.getStats();

      // Should create new empty memory
      expect(stats.totalMessages).toBe(0);
      expect(stats.recentCount).toBe(0);
    });

    it('preserves Date objects correctly', async () => {
      const manager = new MemoryManager(config, mockLLMClient);
      const testDate = new Date('2026-02-26T10:30:00.000Z');

      await manager.addMessage({
        role: 'user',
        content: 'Test',
        timestamp: testDate
      });

      // Create new manager to load from disk
      const manager2 = new MemoryManager(config, mockLLMClient);
      const stats = manager2.getStats();

      // Verify that the timestamp was preserved as a Date object
      expect(stats.lastUpdated).toBeInstanceOf(Date);
      expect(stats.lastUpdated.getTime()).toBeGreaterThan(0);
    });
  });
});
