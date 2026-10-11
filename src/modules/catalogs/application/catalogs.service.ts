import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import { paginate } from '../../../shared/application/pagination';
@Injectable()
export class CatalogsService {
  constructor(private readonly store: PackingStore) {}
  fruits() {
    return this.store.find('fruits');
  }
  areas() {
    return this.store.find('areas');
  }
  async customers(query: { page?: number; limit?: number }) {
    return paginate(await this.store.find('customers'), query);
  }
  async customer(id: number) {
    const value = await this.store.get('customers', id);
    ensure(value, 'Customer not found', 404);
    return value;
  }
  async save(input: { name?: string; country?: string }, id?: number) {
    if (id !== undefined) await this.customer(id);
    const name = input.name?.trim();
    const country = input.country?.trim();
    ensure(name === undefined || name.length > 0, 'Name must not be blank');
    ensure(
      country === undefined || country.length > 0,
      'Country must not be blank',
    );
    const value = await this.store.save('customers', {
      ...(id ? { id } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(country !== undefined ? { country } : {}),
    });
    return this.customer(value.id);
  }
  async remove(id: number) {
    await this.customer(id);
    await this.store.remove('customers', { id });
  }
}
