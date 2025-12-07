export default class Product {
  constructor(id, name, category, expirationDate, boughtDate, quantity, quantityType, price, image, notes, toBuy = false, inProgress = false) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.category = category;
    this.expirationDate = expirationDate;
    this.boughtDate = boughtDate;
    this.quantity = quantity;
    this.quantityType = quantityType;
    this.image = image;
    this.notes = notes;
    this.toBuy = toBuy;
    this.inProgress = inProgress;
  }
}