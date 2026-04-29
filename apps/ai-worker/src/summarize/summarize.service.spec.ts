import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SummarizeService } from './summarize.service.js';
import { AiService } from '../ai/ai.service.js';

const mockAi = {
  completeJson: jest.fn<(s: string, p: string, m?: number) => Promise<unknown>>(),
};

describe('SummarizeService', () => {
  let service: SummarizeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummarizeService,
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<SummarizeService>(SummarizeService);
    jest.clearAllMocks();
  });

  describe('summarizeCard', () => {
    it('should return summary and action items', async () => {
      mockAi.completeJson.mockResolvedValue({
        summary: 'Fix the login bug',
        actionItems: ['Update auth middleware', 'Add error handling'],
      });

      const result = await service.summarizeCard({
        title: 'Login page broken',
        body: 'Users cannot log in after password reset',
        comments: ['I can reproduce this on Chrome', 'Same issue on Firefox'],
      });

      expect(result.summary).toBe('Fix the login bug');
      expect(result.actionItems).toHaveLength(2);
      expect(mockAi.completeJson).toHaveBeenCalledWith(
        expect.stringContaining('project management assistant'),
        expect.stringContaining('Login page broken'),
        512,
      );
    });

    it('should handle cards with no body or comments', async () => {
      mockAi.completeJson.mockResolvedValue({
        summary: 'Basic task',
        actionItems: [],
      });

      const result = await service.summarizeCard({ title: 'Quick fix' });

      expect(result.summary).toBe('Basic task');
      expect(mockAi.completeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('(none)'),
        512,
      );
    });
  });

  describe('summarizeBoard', () => {
    it('should return board summary with bottlenecks and recommendations', async () => {
      mockAi.completeJson.mockResolvedValue({
        summary: 'Board is progressing well',
        bottlenecks: ['Too many cards in review'],
        recommendations: ['Break large tasks into subtasks'],
      });

      const result = await service.summarizeBoard({
        boardName: 'Sprint Board',
        columns: [
          { name: 'To Do', cards: [{ title: 'Task 1' }] },
          { name: 'Done', cards: [{ title: 'Task 2', priority: 'high', storyPoints: 5 }] },
        ],
      });

      expect(result.summary).toBe('Board is progressing well');
      expect(result.bottlenecks).toHaveLength(1);
    });
  });
});
