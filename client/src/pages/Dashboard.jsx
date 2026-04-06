import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement
);

const colorPalette = [
  "#2563EB",
  "#22C55E",
  "#F97316",
  "#A855F7",
  "#0EA5E9",
  "#E11D48",
  "#14B8A6",
  "#F59E0B",
];

function Dashboard({ data, required, requested }) {
  if (!required) {
    return (
      <section className="dashboard-shell">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Upload a dataset in this chat to enable the dashboard.</p>
        </div>
      </section>
    );
  }

  if (!requested) {
    return (
      <section className="dashboard-shell">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Ask: "Build a dashboard for this dataset" to generate it.</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="dashboard-shell">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Generating dashboard from your dataset...</p>
        </div>
      </section>
    );
  }

  const pieData = {
    labels: data.category_breakdown.labels,
    datasets: [
      {
        data: data.category_breakdown.values,
        backgroundColor: colorPalette,
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: data.region_breakdown.labels,
    datasets: [
      {
        label: data.region_breakdown.metric_label,
        data: data.region_breakdown.values,
        backgroundColor: "#2563EB",
      },
    ],
  };

  const lineData = {
    labels: data.trend.labels,
    datasets: [
      {
        label: data.trend.metric_label,
        data: data.trend.values,
        borderColor: "#0EA5E9",
        backgroundColor: "rgba(14,165,233,0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <section className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <div className="section-pill">Executive Dashboard</div>
          <h2>Business Performance Overview</h2>
          <p>
            Auto‑generated insights across categories, regions, and time. Updated
            from your latest data upload.
          </p>
        </div>
        <div className="dashboard-kpis">
          {data.kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>{data.category_breakdown.title}</h3>
          <Pie data={pieData} />
        </div>
        <div className="dashboard-card">
          <h3>{data.region_breakdown.title}</h3>
          <Bar data={barData} />
        </div>
        <div className="dashboard-card wide">
          <h3>{data.trend.title}</h3>
          <Line data={lineData} />
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
