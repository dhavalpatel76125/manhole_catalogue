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
  load_capacity?: string | null
  size?: string | null
  clear_opening?: string | null
  frame_size?: string | null
  cover_size?: string | null
}
export type ProductInput = Pick<Product, 'title' | 'product_code' | 'is_active' | 'price' | 'load_capacity' | 'size' | 'clear_opening' | 'frame_size' | 'cover_size'>
