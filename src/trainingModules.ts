interface TrainingModuleEntry {
  moduleNumber?: number | string;
  moduleLetter?: string;
  title?: string;
}

export interface TrainingModuleGroup<T> {
  key: string;
  label: string;
  number: number | null;
  modules: T[];
}

interface ParsedModuleParts {
  number: number | null;
  letter: string;
  title: string;
}

function getModuleParts(module: TrainingModuleEntry): ParsedModuleParts {
  const title = String(module.title || '');
  const titleMatch = title.match(/^Module\s*(\d+)\s*-?\s*([A-Z])?/i);
  const storedNumber = module.moduleNumber;
  const parsedStoredNumber = storedNumber === undefined || storedNumber === null || storedNumber === ''
    ? Number.NaN
    : Number(storedNumber);
  const number = Number.isFinite(parsedStoredNumber) && parsedStoredNumber > 0
    ? parsedStoredNumber
    : titleMatch ? Number(titleMatch[1]) : null;

  return {
    number,
    letter: String(module.moduleLetter || titleMatch?.[2] || '').trim().toUpperCase(),
    title,
  };
}

export function groupTrainingModules<T extends TrainingModuleEntry>(modules: T[]): TrainingModuleGroup<T>[] {
  const groups = new Map<string, TrainingModuleGroup<T>>();

  modules.forEach((module) => {
    const { number } = getModuleParts(module);
    const key = number === null ? 'module-unassigned' : `module-${number}`;
    const group = groups.get(key) || {
      key,
      label: number === null ? 'Other Modules' : `Module ${number}`,
      number,
      modules: [],
    };
    group.modules.push(module);
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      modules: [...group.modules].sort((first, second) => {
        const firstParts = getModuleParts(first);
        const secondParts = getModuleParts(second);
        return firstParts.letter.localeCompare(secondParts.letter)
          || firstParts.title.localeCompare(secondParts.title, undefined, { numeric: true, sensitivity: 'base' });
      }),
    }))
    .sort((first, second) => {
      if (first.number === null) return second.number === null ? 0 : 1;
      if (second.number === null) return -1;
      return first.number - second.number;
    });
}