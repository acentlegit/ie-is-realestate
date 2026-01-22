
import { sendIntent } from '../api'

export default function Agent() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Agent Portal</h2>
      <button onClick={() => sendIntent('SUBMIT_OFFER', { property_id: 'p1' })}>
        SUBMIT OFFER
      </button>
    </div>
  )
}
