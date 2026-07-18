import { Question, AnswerValue } from '@/types';

export function isCorrect(q: Question, answer: AnswerValue): boolean {
  if (q.qtype === 'MCQ') {
    // answer = index into q.options array
    return q.options[answer as number]?.is_correct === true;
  }

  if (q.qtype === 'Multi') {
    // answer = number[] of selected indices into q.options
    const selected = answer as number[];
    const correctCount = q.options.filter(o => o.is_correct).length;
    if (selected.length !== correctCount) return false;
    return selected.every(i => q.options[i]?.is_correct === true);
  }

  if (q.qtype === 'Match') {
    // answer = Record<pairId, selectedPairId> — user maps each left to a right
    const userMap = answer as Record<number, number>;
    return q.pairs.every(pair => userMap[pair.id] === pair.id);
  }

  if (q.qtype === 'Fill') {
    // answer = Record<blankIndex, userAnswer>
    const userAnswers = answer as Record<number, string>;
    return q.blanks.every(blank => {
      const typed = (userAnswers[blank.blank_index] ?? '').trim().toLowerCase();
      return blank.accepted_answers.map(a => a.toLowerCase()).includes(typed);
    });
  }

  return false;
}
