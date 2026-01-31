import { useState, useEffect } from "react";
import { sendIntent } from "../api";
import { fetchReraProgress } from "../api/dataGovInReraApi";

export default function Compliance() {
  const [reraData, setReraData] = useState(null);
  const [reraLoading, setReraLoading] = useState(false);
  const [reraError, setReraError] = useState(null);

  const loadRera = async () => {
    setReraLoading(true);
    setReraError(null);
    try {
      const out = await fetchReraProgress({ limit: 20, offset: 0 });
      if (out.error) {
        setReraError(out.error);
        setReraData(null);
      } else {
        setReraData(out);
        setReraError(null);
      }
    } catch (e) {
      setReraError(e?.message || "RERA request failed");
      setReraData(null);
    } finally {
      setReraLoading(false);
    }
  };

  useEffect(() => {
    loadRera();
  }, []);

  const records = reraData?.records || [];

  return (
    <div style={{ padding: 20 }}>
      <h2>Compliance Portal</h2>
      <button onClick={() => sendIntent("VIEW_AUDIT", { property_id: "p1" })}>
        VIEW AUDIT
      </button>

      <section style={{ marginTop: 24 }}>
        <h3>India RERA (data.gov.in)</h3>
        <p style={{ fontSize: 12, color: "#666" }}>
          State/UT-wise implementation progress. Set{" "}
          <code>VITE_DATA_GOV_IN_RERA1_KEY</code> in <code>.env</code> (from
          data.gov.in → My Account).
        </p>
        <button onClick={loadRera} disabled={reraLoading}>
          {reraLoading ? "Loading…" : "Refresh RERA data"}
        </button>
        {reraError && (
          <div style={{ marginTop: 8, color: "#c00", fontSize: 14 }}>
            {reraError}
          </div>
        )}
        {!reraError && records.length > 0 && (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>State / UT</th>
                  <th style={thStyle}>Projects registered</th>
                  <th style={thStyle}>Agents registered</th>
                  <th style={thStyle}>Cases disposed</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>
                      {r.state_ut ?? r.state ?? "—"}
                    </td>
                    <td style={tdStyle}>
                      {r.registrations___projects ?? r.registrations?.projects ?? "—"}
                    </td>
                    <td style={tdStyle}>
                      {r.registrations___agents ?? r.registrations?.agents ?? "—"}
                    </td>
                    <td style={tdStyle}>
                      {r.total_no__of_cases_disposed_by_authority_ ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reraData?.total != null && (
              <p style={{ marginTop: 8, fontSize: 12 }}>
                Showing {records.length} of {reraData.total} rows.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const thStyle = { border: "1px solid #ccc", padding: "6px 10px", textAlign: "left" };
const tdStyle = { border: "1px solid #eee", padding: "6px 10px" };
