export class EMap<A, B> extends Map<A, B> {
  creator: () => B;
  constructor(creator: () => B) {
    super();
    this.creator = creator;
  }
  get(key: A): B {
    const value = super.get(key);
    if (value) return value;
    const created = this.creator();
    super.set(key, created)
    return created;
  }
  has(): boolean {
    return true;
  }
}