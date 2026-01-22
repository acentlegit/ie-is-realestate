
import { sendIntent } from '../api'

export default function Compliance() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Compliance Portal</h2>
      <button onClick={() => sendIntent('VIEW_AUDIT', { property_id: 'p1' })}>
        VIEW AUDIT
      </button>
    </div>
  )
}
