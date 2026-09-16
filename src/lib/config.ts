const rawPath = import.meta.env.VITE_ADMIN_PATH || '/hdhdhdhhdhdcurioo'
export const ADMIN_PATH = '/' + rawPath.replace(/^\/+|\/+$/g, '')
if (!/^\/[a-zA-Z0-9_-]{8,100}$/.test(ADMIN_PATH)) {
  throw new Error('VITE_ADMIN_PATH must be one path segment with 8–100 letters, digits, dashes or underscores.')
}
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '918320587916'
if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) throw new Error('WhatsApp number must contain 8–15 digits, including country code.')
export const PAGE_SIZE = 12
export const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true'
