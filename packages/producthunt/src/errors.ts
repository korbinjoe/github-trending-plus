export class ProductHuntConfigError extends Error {
  constructor(message = "Product Hunt credentials are not configured") {
    super(message);
    this.name = "ProductHuntConfigError";
  }
}

export class ProductHuntRateLimitError extends Error {
  constructor(
    message: string,
    public readonly resetAt: string | null,
  ) {
    super(message);
    this.name = "ProductHuntRateLimitError";
  }
}
