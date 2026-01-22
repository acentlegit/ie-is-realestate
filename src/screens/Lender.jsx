
import { sendIntent } from '../api'

export default function Lender() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Lender Portal</h2>
      <button onClick={() => sendIntent('APPROVE_LOAN', { property_id: 'p1' })}>
        APPROVE LOAN
      </button>
    </div>
  )
}
