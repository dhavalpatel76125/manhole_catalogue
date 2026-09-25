export const PRODUCT_CATEGORIES = [
  'FRP Manhole Cover',
  'FRP Water Gully Cover',
  'FRP Tiles Insert Manhole Cover',
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]
