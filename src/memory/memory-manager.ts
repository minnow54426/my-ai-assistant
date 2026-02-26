import * as fs from 'fs';
import * as path from 'path';
import { GLMClient } from '../llm/glm';
import {
  MemoryConfig,
  SharedMemory,
  ConversationMessage,
  MemorySummary,
  MemoryStats
} from './types';

/**
 * Manages conversation memory with automatic summarization
 */
export class MemoryManager {
  private memory: SharedMemory;
  private config: MemoryConfig;
  private llmClient: GLMClient;
  private lastSummarizationAt: number = 0; // Track total messages at last summarization

  constructor(config: MemoryConfig, llmClient: GLMClient) {
    this.config = config;
    this.llmClient = llmClient;
    this.memory = this.loadOrCreate();
  }

  /**
   * Load existing memory from disk or create new empty memory
   */
  private loadOrCreate(): SharedMemory {
    try {
      if (fs.existsSync(this.config.storagePath)) {
        const data = fs.readFileSync(this.config.storagePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Convert date strings back to Date objects
        return {
          recentMessages: parsed.recentMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          summaries: parsed.summaries.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            coveredPeriod: {
              start: new Date(s.coveredPeriod.start),
              end: new Date(s.coveredPeriod.end)
            }
          })),
          totalMessagesProcessed: parsed.totalMessagesProcessed,
          lastUpdated: new Date(parsed.lastUpdated)
        };
      }
    } catch (error) {
      console.warn('Failed to load memory, creating new:', error);
    }

    // Return new empty memory
    return {
      recentMessages: [],
      summaries: [],
      totalMessagesProcessed: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Add a new message to memory
   */
  async addMessage(message: ConversationMessage): Promise<void> {
    // Add to recent messages
    this.memory.recentMessages.push(message);
    this.memory.totalMessagesProcessed++;
    this.memory.lastUpdated = new Date();

    // Check if we need to summarize (every summarizeAfter messages)
    const messagesSinceLastSumm = this.memory.totalMessagesProcessed - this.lastSummarizationAt;
    const approachingThreshold = messagesSinceLastSumm >= (this.config.summarizeAfter - 5);

    if (messagesSinceLastSumm >= this.config.summarizeAfter) {
      // Time to summarize
      await this.summarizeOldMessages();
      this.lastSummarizationAt = this.memory.totalMessagesProcessed;
    }

    // Only trim if we're not approaching the summarization threshold
    // This allows us to accumulate enough messages to summarize the expected amount
    if (!approachingThreshold) {
      while (this.memory.recentMessages.length > this.config.maxRecentMessages) {
        this.memory.recentMessages.shift();
      }
    }

    // Save to disk
    this.save();
  }

  /**
   * Get formatted context string for LLM
   */
  getContext(): string {
    let context = '';

    // Add summaries
    context += 'Previous topics discussed:\n';
    if (this.memory.summaries.length === 0) {
      context += '(none)\n';
    } else {
      this.memory.summaries.forEach((summary, index) => {
        context += `${index + 1}. ${summary.summary}\n`;
      });
    }

    // Add recent messages
    context += '\nRecent conversation:\n';
    if (this.memory.recentMessages.length === 0) {
      context += '(none)\n';
    } else {
      this.memory.recentMessages.forEach(msg => {
        context += `[${msg.role}]: ${msg.content}\n`;
      });
    }

    return context;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return {
      totalMessages: this.memory.totalMessagesProcessed,
      recentCount: this.memory.recentMessages.length,
      summaryCount: this.memory.summaries.length,
      lastUpdated: this.memory.lastUpdated
    };
  }

  /**
   * Summarize old messages when threshold is reached
   */
  private async summarizeOldMessages(): Promise<void> {
    try {
      // Take oldest messages (summarize 10 at a time, or however many are available)
      const messagesToSummarizeCount = Math.min(10, this.memory.recentMessages.length);
      const messagesToSummarize = this.memory.recentMessages.slice(0, messagesToSummarizeCount);

      if (messagesToSummarize.length === 0) {
        return;
      }

      const prompt = this.buildSummaryPrompt(messagesToSummarize);

      const response = await this.llmClient.sendMessage(prompt);

      // Create summary
      const summary: MemorySummary = {
        summary: response.content,
        messageCount: messagesToSummarize.length,
        createdAt: new Date(),
        coveredPeriod: {
          start: messagesToSummarize[0].timestamp,
          end: messagesToSummarize[messagesToSummarize.length - 1].timestamp
        }
      };

      // Add to summaries
      this.memory.summaries.push(summary);

      // Trim summaries if needed
      while (this.memory.summaries.length > this.config.maxSummaries) {
        this.memory.summaries.shift();
      }

      // Remove summarized messages from recent
      this.memory.recentMessages = this.memory.recentMessages.slice(
        messagesToSummarize.length
      );

    } catch (error) {
      // Don't throw - continue without summarizing
    }
  }

  /**
   * Build prompt for summarization
   */
  private buildSummaryPrompt(messages: ConversationMessage[]): string {
    let prompt = 'Please summarize the following conversation:\n\n';

    messages.forEach(msg => {
      prompt += `[${msg.role}]: ${msg.content}\n`;
    });

    prompt += '\nProvide a concise summary of the main topics discussed.';

    return prompt;
  }

  /**
   * Save memory to disk
   */
  private save(): void {
    try {
      const dir = path.dirname(this.config.storagePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = JSON.stringify(this.memory, null, 2);
      fs.writeFileSync(this.config.storagePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save memory:', error);
      // Don't throw - continue without saving
    }
  }
}
