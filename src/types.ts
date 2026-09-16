export interface Product {
  id: string
  title: string
  product_code: string | null
  image_url: string
  image_path: string
  display_order: number
  is_active: boolean
  price: number | null
  created_at: string
  updated_at: string
}
export type ProductInput = Pick<Product, 'title' | 'product_code' | 'is_active' | 'price'>
