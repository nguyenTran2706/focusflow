import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { SummarizeCardDto, SummarizeBoardDto } from './dto/summarize-card.dto.js';

@Injectable()
export class SummarizeService {
  constructor(private readonly ai: AiService) {}

  async summarizeCard(dto: SummarizeCardDto): Promise<{ summary: string; actionItems: string[] }> {
    const commentsBlock = dto.comments?.length
      ? `\n\nComments:\n${dto.comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    const prompt = `Card title: ${dto.title}\nDescription: ${dto.body ?? '(none)'}${commentsBlock}`;

    return this.ai.completeJson(
      'You are a project management assistant. Summarize the following card and extract action items. Return JSON: { "summary": "...", "actionItems": ["..."] }',
      prompt,
      512,
    );
  }

  async summarizeBoard(dto: SummarizeBoardDto): Promise<{ summary: string; bottlenecks: string[]; recommendations: string[] }> {
    const columnsText = dto.columns
      .map((col) => {
        const cardLines = col.cards.map(
          (c) => `  - ${c.title} (priority: ${c.priority ?? 'none'}, points: ${c.storyPoints ?? '?'}, assignee: ${c.assignee ?? 'unassigned'})`,
        );
        return `${col.name} (${col.cards.length} cards):\n${cardLines.join('\n')}`;
      })
      .join('\n\n');

    const prompt = `Board: ${dto.boardName}\n\n${columnsText}`;

    return this.ai.completeJson(
      'You are a project management assistant. Analyze this Kanban board and provide a status summary, identify bottlenecks, and give recommendations. Return JSON: { "summary": "...", "bottlenecks": ["..."], "recommendations": ["..."] }',
      prompt,
      1024,
    );
  }
}
