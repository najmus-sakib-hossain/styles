export class SequentialIdGenerator {
  private index = BigInt(0)

  generate(): string {
    const id = this.index.toString(32)
    this.index++
    return id
  }
}
