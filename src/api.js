
export async function sendIntent(intent, payload) {
  return fetch('/intent/' + intent, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token'
    },
    body: JSON.stringify(payload)
  }).then(r => r.json())
}
