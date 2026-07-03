import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dataPath = existsSync(join(process.cwd(), 'server/data/kanjiData.json'))
  ? join(process.cwd(), 'server/data/kanjiData.json')
  : join(process.cwd(), 'data/kanjiData.json');
const kanjiData = JSON.parse(readFileSync(dataPath, 'utf8'));

export function parseCustomKanji(input = '') {
  return Array.from(new Set(input.split(/[\s,、，]+/).map((item) => item.trim()).filter(Boolean)));
}

export function getEntriesForSettings(settings) {
  if (settings.mode === 'grade') return kanjiData[settings.grade] ?? [];
  const custom = parseCustomKanji(settings.customKanjiInput);
  return custom.map((kanji) => {
    const known = Object.values(kanjiData).flat().find((entry) => entry.kanji === kanji);
    return known ?? {
      kanji,
      reading: ['未登録'],
      meaning: ['先生指定漢字'],
      grade: 'custom',
      onyomi: [],
      kunyomi: [],
      promptTypes: ['meaning'],
      distractors: custom.filter((item) => item !== kanji).slice(0, 6)
    };
  });
}

export function allKnownEntries() {
  return Object.values(kanjiData).flat();
}

export function allKnownKanji() {
  return Array.from(new Set(allKnownEntries().map((entry) => entry.kanji)));
}
