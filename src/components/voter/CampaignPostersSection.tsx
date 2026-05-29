"use client";

import { useEffect, useState } from "react";
import PosterCard from "@/components/candidate/PosterCard";
import { getAllCampaignPosters, PosterWithCandidate } from "@/app/actions/posters";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignPostersSection() {
  const [posters, setPosters] = useState<PosterWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [positions, setPositions] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const data = await getAllCampaignPosters();
      setPosters(data);

      // Build unique position list for filter tabs
      const unique = Array.from(
        new Set(data.map((p) => p.candidate.position.name))
      ).sort();
      setPositions(unique);

      setLoading(false);
    }
    load();
  }, []);

  const filtered =
    filter === "All"
      ? posters
      : posters.filter((p) => p.candidate.position.name === filter);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="section-wrapper">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">📣 Campaign Posters</h2>
          <p className="section-subtitle">
            See what each candidate stands for before you vote.
          </p>
        </div>
        {!loading && posters.length > 0 && (
          <span className="poster-count">
            {posters.length} poster{posters.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      {!loading && positions.length > 1 && (
        <div className="filter-tabs">
          {["All", ...positions].map((pos) => (
            <button
              key={pos}
              className={`filter-tab ${filter === pos ? "active" : ""}`}
              onClick={() => setFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-row">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : posters.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p className="empty-title">No campaign posters yet</p>
          <p className="empty-hint">
            Candidates haven&apos;t posted their campaigns yet. Check back soon!
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p className="empty-title">No posters for this position</p>
          <button className="btn-reset" onClick={() => setFilter("All")}>
            View all posters
          </button>
        </div>
      ) : (
        <div className="posters-grid">
          {filtered.map((p) => (
            <PosterCard key={p.id} poster={p} editable={false} />
          ))}
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .section-wrapper {
          padding: 28px 0;
          border-top: 1px solid #e8eaf0;
          margin-top: 32px;
        }

        /* Header */
        .section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 19px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 4px;
        }
        .section-subtitle {
          font-size: 13.5px;
          color: #6b7280;
          margin: 0;
        }
        .poster-count {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          background: #f3f4f6;
          border-radius: 999px;
          padding: 4px 12px;
          align-self: center;
        }

        /* Filter tabs */
        .filter-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .filter-tab {
          font-size: 12.5px;
          font-weight: 600;
          padding: 5px 14px;
          border-radius: 999px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .filter-tab:hover {
          border-color: #1a56db;
          color: #1a56db;
        }
        .filter-tab.active {
          background: linear-gradient(135deg, #1a56db, #7e3af2);
          color: #fff;
          border-color: transparent;
        }

        /* Grid */
        .posters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        /* Skeletons */
        .loading-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .skeleton-card {
          height: 320px;
          border-radius: 16px;
          background: linear-gradient(90deg, #f0f1f5 25%, #e8eaf0 50%, #f0f1f5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }

        /* Empty */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 24px;
          text-align: center;
          gap: 10px;
          color: #9ca3af;
        }
        .empty-icon { font-size: 40px; }
        .empty-title {
          font-size: 16px;
          font-weight: 700;
          color: #374151;
          margin: 0;
        }
        .empty-hint {
          font-size: 13.5px;
          max-width: 340px;
          margin: 0;
          line-height: 1.6;
        }
        .btn-reset {
          background: none;
          border: none;
          color: #1a56db;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }
        .btn-reset:hover { text-decoration: underline; }
      `}</style>
    </section>
  );
}
