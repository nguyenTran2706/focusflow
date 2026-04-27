import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { BoardInsightsDto } from './dto/insights.dto.js';

export interface InsightsResult {
  healthScore: number;
  highlights: string[];
  risks: string[];
  suggestions: string[];
}

@Injectable()
export class InsightsService {
  constructor(private readonly ai: AiService) {}

  async analyzeBoard(dto: BoardInsightsDto): Promise<InsightsResult> {
    const recentLines = dto.recentActivity
      ?.slice(0, 5)
      .map((a) => `  - "${a.title}" → ${a.columnName} (${a.updatedAt})`)
      .join('\n') ?? '  (no recent activity)';

    const prompt = `Board: ${dto.boardName}
Total cards: ${dto.totalCards}
Status distribution: ${JSON.stringify(dto.statusCounts)}
Priority distribution: ${JSON.stringify(dto.priorityCounts)}
Card types: ${JSON.stringify(dto.typeCounts)}
Completed in last 7 days: ${dto.completedRecently}
Created in last 7 days: ${dto.createdRecently}
Due within 7 days: ${dto.dueSoon}
Average velocity: ${dto.avgVelocity ?? 'N/A'}

Recent activity:
${recentLines}`;

    return this.ai.completeJson<InsightsResult>(
      `You are a project analytics assistant. Analyze the board metrics and return JSON:
{
  "healthScore": <1-100 integer rating the project health>,
  "highlights": ["<positive observations>"],
  "risks": ["<things that could go wrong>"],
  "suggestions": ["<actionable improvement ideas>"]
}
Keep each array to 2-4 items. Be specific and concise.`,
      prompt,
      1024,
    );
  }
}
