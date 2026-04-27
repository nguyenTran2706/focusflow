import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { SprintRetroDto } from './dto/retro.dto.js';

export interface RetroResult {
  summary: string;
  wentWell: string[];
  needsImprovement: string[];
  actionItems: string[];
  velocityTrend: string;
  completionRate: number;
}

@Injectable()
export class RetroService {
  constructor(private readonly ai: AiService) {}

  async generateRetro(dto: SprintRetroDto): Promise<RetroResult> {
    const completedList = dto.completedItems
      .map((c) => `  - ${c.title} (${c.points ?? '?'} pts, ${c.type ?? 'task'})`)
      .join('\n');

    const incompleteList = dto.incompleteItems
      .map((c) => `  - ${c.title} (${c.points ?? '?'} pts, ${c.type ?? 'task'}, status: ${c.column ?? 'unknown'})`)
      .join('\n');

    const prompt = `Sprint: ${dto.sprintName}
Goal: ${dto.goal ?? 'Not specified'}
Duration: ${dto.durationDays} days
Cards completed: ${dto.completedCards}/${dto.totalCards}
Points completed: ${dto.completedPoints}/${dto.totalPoints}
Previous sprint velocity: ${dto.previousVelocity ?? 'N/A'}

Completed items:
${completedList || '  (none)'}

Incomplete items:
${incompleteList || '  (none)'}`;

    return this.ai.completeJson<RetroResult>(
      `You are an agile coach. Generate a sprint retrospective report. Return JSON:
{
  "summary": "<2-3 sentence executive summary>",
  "wentWell": ["<2-4 positive observations>"],
  "needsImprovement": ["<2-4 areas for improvement>"],
  "actionItems": ["<2-3 specific actionable next steps>"],
  "velocityTrend": "<one of: improving, stable, declining, insufficient_data>",
  "completionRate": <percentage as integer 0-100>
}
Be specific and reference actual card data. Keep observations actionable.`,
      prompt,
      1024,
    );
  }
}
