import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({ children, noPadding = false }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#F6F7F9" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F6F7F9" }}>
        <Topbar />
        <div style={noPadding ? {} : { padding: 20, background: "#F6F7F9" }}>{children}</div>
      </div>
    </div>
  );
}

