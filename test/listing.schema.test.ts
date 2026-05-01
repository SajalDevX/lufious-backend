import { describe, expect, it } from 'vitest';
import {
  ListingCreate,
  ListingQuery,
  ListingDoc
} from '../src/schemas/Listing.js';

describe('ListingCreate', () => {
  it('accepts minimal valid input', () => {
    const doc = ListingCreate.parse({
      title: 'Aloe Vera Cuttings',
      price: 199,
      category: 'produce'
    });
    expect(doc.title).toBe('Aloe Vera Cuttings');
    expect(doc.category).toBe('produce');
  });

  it('rejects unknown category', () => {
    expect(() =>
      ListingCreate.parse({ title: 'X', price: 10, category: 'crypto' })
    ).toThrow();
  });
});

describe('ListingQuery', () => {
  it('coerces page/size and price', () => {
    const q = ListingQuery.parse({
      page: '2',
      size: '10',
      minPrice: '50',
      category: 'tools'
    });
    expect(q.page).toBe(2);
    expect(q.size).toBe(10);
    expect(q.minPrice).toBe(50);
    expect(q.category).toBe('tools');
  });

  it('defaults pagination', () => {
    const q = ListingQuery.parse({});
    expect(q.page).toBe(1);
    expect(q.size).toBe(20);
  });
});

describe('ListingDoc', () => {
  it('parses a stored doc', () => {
    const now = Date.now();
    const doc = ListingDoc.parse({
      _id: 'abc',
      sellerId: 'u1',
      title: 'Tomato Seeds',
      description: 'Heirloom variety',
      price: 250,
      category: 'seeds',
      photoUrl: null,
      currency: 'INR',
      createdAt: now,
      updatedAt: now,
      status: 'active'
    });
    expect(doc.currency).toBe('INR');
    expect(doc.status).toBe('active');
  });
});
