
import { sendIntent } from '../api'

export default function Government() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Government Portal</h2>
      <button onClick={() => sendIntent('RECORD_DEED', { property_id: 'p1' })}>
        RECORD DEED
      </button>
    </div>
  )
}
