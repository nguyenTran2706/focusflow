import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { AutoLabelDto } from './dto/auto-label.dto.js';

export interface LabelResult {
  labels: string[];
  type: string;
  priority: string;
  estimatedPoints: number | null;
}

@Injectable()
export class LabelsService {
  constructor(private readonly ai: AiService) {}

  async autoLabel(dto: AutoLabelDto): Promise<LabelResult> {
    const existingContext = dto.existingLabels?.length
      ? `\nExisting labels in this project: ${dto.existingLabels.join(', ')}`
      : '';

    const prompt = `Card title: ${dto.title}\nDescription: ${dto.body ?? '(none)'}${existingContext}`;

    return this.ai.completeJson<LabelResult>(
      `You are a project management assistant. Analyze the card and suggest categorization. Return JSON:
{
  "labels": ["<2-4 relevant labels like: bug, feature, refactor, docs, ui, backend, database, api, testing, security, performance>"],
  "type": "<one of: task, bug, story, epic, spike>",
  "priority": "<one of: urgent, high, medium, low>",
  "estimatedPoints": <null or fibonacci number 1,2,3,5,8,13 estimating effort>
}
Prefer reusing existing labels when they fit. Be conservative with estimates.`,
      prompt,
      256,
    );
  }
}
