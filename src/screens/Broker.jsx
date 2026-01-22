
import { sendIntent } from '../api'

export default function Broker() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Broker Portal</h2>
      <button onClick={() => sendIntent('VIEW_PIPELINE', { property_id: 'p1' })}>
        VIEW PIPELINE
      </button>
    </div>
  )
}
