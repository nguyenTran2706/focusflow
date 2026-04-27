import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { LabelsService } from './labels.service.js';
import { AiService } from '../ai/ai.service.js';

const mockAi = { completeJson: jest.fn() };

describe('LabelsService', () => {
  let service: LabelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
    jest.clearAllMocks();
  });

  it('should return auto-generated labels, type, priority, and points', async () => {
    mockAi.completeJson.mockResolvedValue({
      labels: ['bug', 'backend', 'api'],
      type: 'bug',
      priority: 'high',
      estimatedPoints: 3,
    });

    const result = await service.autoLabel({
      title: 'API returns 500 on /users endpoint',
      body: 'When calling GET /api/users, server returns 500',
      existingLabels: ['bug', 'feature', 'backend'],
    });

    expect(result.labels).toContain('bug');
    expect(result.type).toBe('bug');
    expect(result.priority).toBe('high');
    expect(result.estimatedPoints).toBe(3);
  });

  it('should work without existing labels or body', async () => {
    mockAi.completeJson.mockResolvedValue({
      labels: ['feature', 'ui'],
      type: 'task',
      priority: 'medium',
      estimatedPoints: 2,
    });

    const result = await service.autoLabel({ title: 'Add dark mode toggle' });

    expect(result.labels).toHaveLength(2);
    expect(mockAi.completeJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('(none)'),
      256,
    );
  });
});
