
import { sendIntent } from '../api'

export default function Title() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Title Portal</h2>
      <button onClick={() => sendIntent('CLEAR_TITLE', { property_id: 'p1' })}>
        CLEAR TITLE
      </button>
    </div>
  )
}
