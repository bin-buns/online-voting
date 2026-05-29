"use client";

import Image from "next/image";
import { useState } from "react";
import { PosterWithCandidate } from "@/app/actions/posters";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  poster: PosterWithCandidate;
  /** If true, shows Edit / Delete buttons (candidate view only) */
  editable?: boolean;
  onEdit?: (poster: PosterWithCandidate) => void;
  onDelete?: (posterId: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PosterCard({ poster, editable = false, onEdit, onDelete }: Props) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const candidateName = poster.candidate.profile.full_name;
  const positionName = poster.candidate.position.name;
  const photoUrl = poster.candidate.photo_url;

  return (
    <article className="poster-card">
      {/* ── Owner Tag ─────────────────────────────────────────────────── */}
      <div className="owner-tag">
        <div className="owner-avatar">
          {photoUrl && !imgError ? (
            <Image
              src={photoUrl}
              alt={candidateName}
              width={40}
              height={40}
              className="owner-photo"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="owner-initials">{getInitials(candidateName)}</span>
          )}
        </div>
        <div className="owner-info">
          <span className="owner-name">{candidateName}</span>
          <span className="owner-position">{positionName}</span>
        </div>
        <span className="owner-badge">Candidate</span>
      </div>

      {/* ── Poster Image ──────────────────────────────────────────────── */}
      {poster.image_url && (
        <div className="poster-image-wrap">
          <Image
            src={poster.image_url}
            alt={poster.title}
            width={600}
            height={340}
            className="poster-image"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="poster-body">
        <h3 className="poster-title">{poster.title}</h3>

        <p className={`poster-content ${expanded ? "expanded" : ""}`}>
          {poster.content}
        </p>

        {poster.content.length > 160 && (
          <button
            className="read-more-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        <div className="poster-meta">
          <span className="poster-date">{formatDate(poster.created_at)}</span>

          {editable && (
            <div className="poster-actions">
              <button
                className="btn-edit"
                onClick={() => onEdit?.(poster)}
                aria-label="Edit poster"
              >
                ✏️ Edit
              </button>
              <button
                className="btn-delete"
                onClick={() => onDelete?.(poster.id)}
                aria-label="Delete poster"
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .poster-card {
          background: #ffffff;
          border: 1px solid #e8eaf0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .poster-card:hover {
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        /* Owner Tag */
        .owner-tag {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f0f1f5;
          background: #fafbff;
        }
        .owner-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #1a56db, #7e3af2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .owner-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .owner-initials {
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .owner-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .owner-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .owner-position {
          font-size: 11.5px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .owner-badge {
          font-size: 10px;
          font-weight: 700;
          color: #1a56db;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          padding: 2px 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }

        /* Image */
        .poster-image-wrap {
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #f3f4f6;
        }
        .poster-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .poster-card:hover .poster-image {
          transform: scale(1.03);
        }

        /* Body */
        .poster-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .poster-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.4;
        }
        .poster-content {
          font-size: 13.5px;
          color: #4b5563;
          line-height: 1.6;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: all 0.2s;
        }
        .poster-content.expanded {
          -webkit-line-clamp: unset;
          overflow: visible;
        }
        .read-more-btn {
          background: none;
          border: none;
          color: #1a56db;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-align: left;
          width: fit-content;
        }
        .read-more-btn:hover {
          text-decoration: underline;
        }

        /* Meta */
        .poster-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .poster-date {
          font-size: 11.5px;
          color: #9ca3af;
        }
        .poster-actions {
          display: flex;
          gap: 8px;
        }
        .btn-edit,
        .btn-delete {
          font-size: 12px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          padding: 5px 12px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-edit {
          background: #eff6ff;
          color: #1a56db;
        }
        .btn-edit:hover {
          background: #dbeafe;
        }
        .btn-delete {
          background: #fff5f5;
          color: #e53e3e;
        }
        .btn-delete:hover {
          background: #fed7d7;
        }
        .btn-edit:active,
        .btn-delete:active {
          transform: scale(0.97);
        }
      `}</style>
    </article>
  );
}
