import selectors from '../support/selectors';

export class InventoryPage {
  private productCard(name: string) {
    return cy.contains(selectors.inventory.itemName, name).closest(selectors.inventory.item);
  }

  public addProduct(name: string) {
    return this.productCard(name).find(selectors.inventory.addToCartBtn).click();
  }

  public removeProduct(name: string) {
    return this.productCard(name).find(selectors.inventory.removeBtn).click();
  }

  public addProducts(products: ReadonlyArray<{ name: string }>) {
    return cy.then(() => {
      products.forEach(({ name }) => {
        this.addProduct(name);
      });
    });
  }
}
