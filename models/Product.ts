export interface ProductItem {
  id: string | number;
  name: string;
  category: string;
  expirationDate: string;
  boughtDate: string;
  quantity: string;
  quantityType: string;
  price: number | string;
  image: string;
  notes: string;
  toBuy: boolean;
  inProgress: boolean;
}

export default class Product implements ProductItem {
  id: string | number;
  name: string;
  category: string;
  expirationDate: string;
  boughtDate: string;
  quantity: string;
  quantityType: string;
  price: number | string;
  image: string;
  notes: string;
  toBuy: boolean;
  inProgress: boolean;

  constructor(
    id: string | number,
    name: string,
    category: string,
    expirationDate: string,
    boughtDate: string,
    quantity: string,
    quantityType: string,
    price: number | string,
    image: string,
    notes: string,
    toBuy = false,
    inProgress = false
  ) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.expirationDate = expirationDate;
    this.boughtDate = boughtDate;
    this.quantity = quantity;
    this.quantityType = quantityType;
    this.price = price;
    this.image = image;
    this.notes = notes;
    this.toBuy = toBuy;
    this.inProgress = inProgress;
  }
}
