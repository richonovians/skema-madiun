import { Exclude, instanceToPlain } from 'class-transformer';
import { BaseEntity } from './base.entity';

class SampleEntity extends BaseEntity<SampleEntity> {
  id!: number;
  nama!: string;

  @Exclude()
  rahasia?: string;
}

describe('BaseEntity', () => {
  it('constructor menyalin objek parsial ke instance', () => {
    const entity = new SampleEntity({ id: 1, nama: 'A' });

    expect(entity.id).toBe(1);
    expect(entity.nama).toBe('A');
  });

  it('@Exclude menyembunyikan field saat serialisasi', () => {
    const entity = new SampleEntity({ id: 1, nama: 'A', rahasia: 'jangan-bocor' });

    const plain = instanceToPlain(entity);

    expect(plain).toEqual({ id: 1, nama: 'A' });
    expect(plain.rahasia).toBeUndefined();
  });
});
