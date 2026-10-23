import products from '../fixtures/products.json';

export function fixtureProduct(name: string): (typeof products)[number] {
  const product = products.find((product) => product.name === name);
  if (product === undefined) {
    throw new Error(`Missing fixture product: ${name}`);
  }
  return product;
}
