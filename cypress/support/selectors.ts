export default {
  auth: {
    user: '[data-test="username"]',
    password: '[data-test="password"]',
    loginBtn: '[data-test="login-button"]',
    error: '[data-test="error"]',
  },
  inventory: {
    title: '[data-test="title"]',
    inventoryList: '[data-test="inventory-list"]',
    sortDropdown: '[data-test="product-sort-container"]',
    itemName: '[data-test="inventory-item-name"]',
    itemPrice: '[data-test="inventory-item-price"]',
    itemDescription: '[data-test="inventory-item-desc"]',
    item: '[data-test="inventory-item"]',
    addToCartBtn: '[data-test^="add-to-cart-"]',
    removeBtn: '[data-test^="remove-"]',
  },
  productDetails: {
    backToProductsBtn: '[data-test="back-to-products"]',
  },
  cart: {
    link: '[data-test="shopping-cart-link"]',
    badge: '[data-test="shopping-cart-badge"]',
    item: '[data-test="inventory-item"]',
    quantity: '[data-test="item-quantity"]',
  },
  menu: {
    openBtn: '#react-burger-menu-btn',
    logoutLink: '[data-test="logout-sidebar-link"]',
  },
};
