import { normalizeInviteCode } from '@hdp/shared';
import { generateInviteCode } from '../sharing/sharing.service.js';
import { buildGardenMessage, listNames } from './push.messages.js';

describe('avisos del jardín compartido', () => {
  it('lista nombres sin repetir y resume los largos', () => {
    expect(listNames(['Monstera'])).toBe('Monstera');
    expect(listNames(['Monstera', 'Pothos'])).toBe('Monstera y Pothos');
    expect(listNames(['A', 'B', 'C'])).toBe('A, B y C');
    expect(listNames(['A', 'B', 'C', 'D', 'A'])).toBe('A, B y 2 más');
  });

  it('junta varias acciones de una persona en un aviso', () => {
    const msg = buildGardenMessage({
      gardenId: 'g',
      gardenName: 'Casa',
      actorId: 'u',
      actorName: 'Ana',
      items: [
        { kind: 'water', plantId: 'p1', plantName: 'Monstera' },
        { kind: 'water', plantId: 'p2', plantName: 'Pothos' },
        { kind: 'water', plantId: 'p3', plantName: 'Ficus' },
        { kind: 'diagnosis', plantId: 'p1', plantName: 'Monstera', extra: 'Trips' },
      ],
    });
    expect(msg.title).toBe('Ana · Casa');
    expect(msg.body).toBe('Regó Monstera, Pothos y Ficus\nRevisó la salud de Monstera: Trips');
    expect(msg.plantId).toBeNull();
  });

  it('si todo es de una planta, el aviso abre esa planta', () => {
    const msg = buildGardenMessage({
      gardenId: 'g',
      gardenName: 'Casa',
      actorId: 'u',
      actorName: 'Ana',
      items: [{ kind: 'plant_added', plantId: 'p9', plantName: 'Aloe' }],
    });
    expect(msg.body).toBe('Añadió Aloe');
    expect(msg.plantId).toBe('p9');
  });

  it('genera códigos de invitación legibles y los normaliza al escribirlos', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/);
    expect(normalizeInviteCode(code.toLowerCase().replace('-', ' '))).toBe(code);
    expect(normalizeInviteCode('hoja7k3q')).toBe('HOJA-7K3Q');
  });
});
