export class Item {
  constructor(
    public id: string,
    public title: string,
    public subtitle?: string,
    public image?: string,
    public category?: string,
    public createdAt: Date = new Date()
  ) {}

  static create(
    title: string,
    subtitle?: string,
    image?: string,
    category?: string
  ): Item {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return new Item(id, title, subtitle, image, category);
  }

  update(updates: Partial<Omit<Item, 'id' | 'createdAt'>>): Item {
    return new Item(
      this.id,
      updates.title ?? this.title,
      updates.subtitle ?? this.subtitle,
      updates.image ?? this.image,
      updates.category ?? this.category,
      this.createdAt
    );
  }
}
