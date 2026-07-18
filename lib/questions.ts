import { ApiQuestion, Question } from '@/types';

export function toRuntimeQuestion(q: ApiQuestion): Question {
  return {
    id: q.id,
    qtype: q.qtype,
    text: q.stem,
    category: q.subject,
    skill: q.skill,
    level: q.level,
    options: [...q.mcq_options].sort((a, b) => a.sort_order - b.sort_order),
    pairs:   [...q.match_pairs].sort((a, b) => a.sort_order - b.sort_order),
    blanks:  [...q.fill_blanks].sort((a, b) => a.sort_order - b.sort_order),
  };
}
