import type { PropagationGuide } from '@hdp/shared';
import { cleanGuide } from './guide.generator.js';
import { currentTasks, reminderDays } from './schedule.js';

export const TOMATO_GUIDE: PropagationGuide = {
  suitable: true,
  suitabilityNote: 'Se siembra muy bien.',
  difficulty: 'easy',
  bestMonths: [2, 3, 4, 13],
  successRate: '80-95 % germinan',
  materials: ['Semillero', 'Sustrato de semillero con 20 % de perlita'],
  stages: [
    { title: 'Siembra', summary: 'Sembrar', steps: ['Siembra a 5 mm'], minDays: 0, maxDays: 1, doneWhen: 'Sembradas', tasks: [{ text: 'Riega con pulverizador', everyDays: 0 }], tips: [] },
    {
      title: 'Germinación',
      summary: 'Esperar',
      steps: ['Mantén 22-25 °C'],
      minDays: 5,
      maxDays: 10,
      doneWhen: 'Asoman los cotiledones',
      tasks: [
        { text: 'Pulveriza la superficie.', everyDays: 1 },
        { text: 'Ventila la tapa', everyDays: 2 },
      ],
      tips: ['No dejes que se seque'],
    },
    { title: 'Plántula', summary: 'Crecer', steps: ['Mucha luz'], minDays: 14, maxDays: 21, doneWhen: '2 hojas verdaderas', tasks: [], tips: [] },
  ],
  problems: [{ problem: 'Se caen las plántulas', solution: 'Damping-off: ventila y riega menos' }],
};

describe('crianza: tareas y avisos', () => {
  it('una tarea única toca hasta que se hace; una repetida, según su frecuencia', () => {
    const t0 = currentTasks(TOMATO_GUIDE, 0, '2026-11-20', {}, '2026-11-21');
    expect(t0[0]).toMatchObject({ due: true, everyDays: 0 });
    expect(currentTasks(TOMATO_GUIDE, 0, '2026-11-20', { '0:0': '2026-11-20' }, '2026-11-21')[0]!.due).toBe(false);

    const t1 = currentTasks(TOMATO_GUIDE, 1, '2026-11-20', { '1:1': '2026-11-20' }, '2026-11-21');
    expect(t1[0]!.due).toBe(true); // pulverizar: nunca hecho
    expect(t1[1]!.due).toBe(false); // ventilar: cada 2 días, hecho ayer
  });

  it('los avisos juntan las tareas de cada día y avisan de revisar la etapa', () => {
    const days = reminderDays(
      { name: 'Tomates', plan: TOMATO_GUIDE, stageIndex: 1, stageStartDay: '2026-11-15', done: { '1:0': '2026-11-21', '1:1': '2026-11-20' } },
      '2026-11-21',
      '2026-11-26',
    );
    expect(days.get('2026-11-22')).toBe('Tomates: pulveriza la superficie, ventila la tapa');
    expect(days.get('2026-11-23')).toBe('Tomates: pulveriza la superficie');
    expect(days.get('2026-11-25')).toContain('revisa si ya está lista');
    expect(days.has('2026-11-21')).toBe(false);
  });

  it('limpia la guía: meses válidos, duraciones coherentes y como mucho 4 tareas', () => {
    const g = cleanGuide({
      ...TOMATO_GUIDE,
      stages: [{ ...TOMATO_GUIDE.stages[1]!, minDays: 10, maxDays: 3, tasks: Array(6).fill({ text: 'x', everyDays: 99 }) }],
    });
    expect(g.bestMonths).toEqual([2, 3, 4]);
    expect(g.stages[0]).toMatchObject({ minDays: 10, maxDays: 10 });
    expect(g.stages[0]!.tasks).toHaveLength(4);
    expect(g.stages[0]!.tasks[0]!.everyDays).toBe(30);
  });
});
