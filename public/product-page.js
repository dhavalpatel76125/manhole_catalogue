const quantity = document.querySelector('#quantity')
const link = document.querySelector('#whatsapp')
const decrease = document.querySelector('#decrease')
const increase = document.querySelector('#increase')
if (quantity && link && decrease && increase) {
  const destination = new URL(link.href)
  const clamp = value => Math.max(1, Math.min(999, Math.trunc(Number(value)) || 1))
  const update = value => {
    const count = clamp(value)
    quantity.value = String(count)
    decrease.disabled = count <= 1
    increase.disabled = count >= 999
    destination.searchParams.set('text', link.dataset.before + count + link.dataset.after)
    link.href = destination.href
  }
  decrease.addEventListener('click', () => update(clamp(quantity.value) - 1))
  increase.addEventListener('click', () => update(clamp(quantity.value) + 1))
  quantity.addEventListener('input', () => {
    // Let customers clear the field while typing, but keep the link valid.
    const count = clamp(quantity.value)
    destination.searchParams.set('text', link.dataset.before + count + link.dataset.after)
    link.href = destination.href
    decrease.disabled = count <= 1
    increase.disabled = count >= 999
  })
  quantity.addEventListener('change', () => update(quantity.value))
  link.addEventListener('click', () => update(quantity.value))
}
