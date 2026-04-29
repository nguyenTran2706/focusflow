import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { RetroService } from './retro.service.js';
import { AiService } from '../ai/ai.service.js';

const mockAi = { completeJson: jest.fn<(s: string, p: string, m?: number) => Promise<unknown>>() };

describe('RetroService', () => {
  let service: RetroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetroService,
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<RetroService>(RetroService);
    jest.clearAllMocks();
  });

  it('should generate a sprint retrospective', async () => {
    mockAi.completeJson.mockResolvedValue({
      summary: 'Productive sprint with 80% completion rate.',
      wentWell: ['Team completed all high-priority items', 'Good velocity'],
      needsImprovement: ['Several bugs carried over', 'Estimation needs work'],
      actionItems: ['Review estimation process', 'Set up automated testing'],
      velocityTrend: 'improving',
      completionRate: 80,
    });

    const result = await service.generateRetro({
      sprintName: 'Sprint 5',
      goal: 'Launch user dashboard',
      totalCards: 10,
      completedCards: 8,
      totalPoints: 40,
      completedPoints: 32,
      durationDays: 14,
      previousVelocity: 28,
      completedItems: [
        { title: 'Dashboard UI', points: 8, type: 'story' },
        { title: 'API integration', points: 5, type: 'task' },
      ],
      incompleteItems: [
        { title: 'Export feature', points: 5, type: 'story', column: 'In Progress' },
      ],
    });

    expect(result.completionRate).toBe(80);
    expect(result.velocityTrend).toBe('improving');
    expect(result.wentWell.length).toBeGreaterThan(0);
    expect(result.actionItems.length).toBeGreaterThan(0);
    expect(mockAi.completeJson).toHaveBeenCalledWith(
      expect.stringContaining('agile coach'),
      expect.stringContaining('Sprint 5'),
      1024,
    );
  });

  it('should handle empty completed and incomplete items', async () => {
    mockAi.completeJson.mockResolvedValue({
      summary: 'Sprint had no activity.',
      wentWell: [],
      needsImprovement: ['No cards completed'],
      actionItems: ['Review sprint planning process'],
      velocityTrend: 'insufficient_data',
      completionRate: 0,
    });

    const result = await service.generateRetro({
      sprintName: 'Sprint 1',
      totalCards: 0,
      completedCards: 0,
      totalPoints: 0,
      completedPoints: 0,
      durationDays: 7,
      completedItems: [],
      incompleteItems: [],
    });

    expect(result.completionRate).toBe(0);
  });
});
