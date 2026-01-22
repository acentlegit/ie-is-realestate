
import { sendIntent } from '../api'

export default function Buyer() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Buyer Portal</h2>
      <button onClick={() => sendIntent('MAKE_OFFER', { property_id: 'p1' })}>
        MAKE OFFER
      </button>
    </div>
  )
}
