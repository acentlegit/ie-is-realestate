
import { sendIntent } from '../api'

export default function Seller() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Seller Portal</h2>
      <button onClick={() => sendIntent('REVIEW_OFFERS', { property_id: 'p1' })}>
        REVIEW OFFERS
      </button>
    </div>
  )
}
