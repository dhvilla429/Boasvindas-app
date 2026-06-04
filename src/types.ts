@import "tailwindcss";

@variant dark (&:where(.dark, .dark *));

/* ==========================================================================
   COSMIC MIDNIGHT MONITORING MODE CSS SPECIFICATIONS
   ========================================================================== */

.dark {
  background-color: #050811 !important;
  color: #cbd5e1 !important;
  color-scheme: dark;
}

/* Core backgrounds override */
.dark body {
  background-color: #050811 !important;
}

/* Card override rules */
.dark .bg-white {
  background-color: #0b111e !important;
  border-color: #1b253b !important;
}

.dark .bg-slate-50 {
  background-color: #050811 !important;
}

.dark .bg-slate-100 {
  background-color: #121b2d !important;
}

.dark .bg-slate-200 {
  background-color: #1d2b45 !important;
}

.dark .bg-slate-50\/50,
.dark .bg-slate-50\/70,
.dark .bg-slate-50\/30 {
  background-color: rgba(18, 27, 45, 0.45) !important;
  border-color: #1b253b !important;
}

/* Card layout groupings */
.dark .border-slate-200,
.dark .border-slate-100,
.dark .border-slate-150,
.dark .border-slate-250,
.dark .border-slate-300 {
  border-color: #1a2438 !important;
}

/* Typography contrast mapping */
.dark .text-slate-900,
.dark .text-slate-800,
.dark .text-slate-700 {
  color: #f8fafc !important;
}

.dark .text-slate-600,
.dark .text-slate-500 {
  color: #a0aec0 !important;
}

.dark .text-slate-400 {
  color: #64748b !important;
}

.dark h1, .dark h2, .dark h3, .dark h4 {
  color: #ffffff !important;
}

/* User identity dashboard controls */
.dark .bg-emerald-50 {
  background-color: rgba(16, 185, 129, 0.1) !important;
  border-color: rgba(16, 185, 129, 0.25) !important;
  color: #34d399 !important;
}

.dark .text-emerald-800 {
  color: #34d399 !important;
}

.dark .bg-rose-50\/70 {
  background-color: rgba(244, 63, 94, 0.1) !important;
  border-color: rgba(244, 63, 94, 0.2) !important;
  color: #fb7185 !important;
}

.dark .text-rose-950 {
  color: #fca5a5 !important;
}

.dark .bg-amber-500\/10 {
  background-color: rgba(245, 158, 11, 0.12) !important;
  border-color: rgba(245, 158, 11, 0.25) !important;
}

.dark .text-slate-950 {
  color: #fbcfe8 !important;
}

/* Form Survey fields & database input widgets */
.dark input,
.dark select,
.dark textarea {
  background-color: #0b111e !important;
  border-color: #1e293b !important;
  color: #f1f5f9 !important;
}

.dark input:focus,
.dark select:focus,
.dark textarea:focus {
  border-color: #f59e0b !important;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.25);
}

.dark input::placeholder,
.dark textarea::placeholder {
  color: #475569 !important;
}

/* Spreadsheet grid details */
.dark table {
  background-color: #0b111e !important;
}

.dark thead th {
  background-color: #101726 !important;
  color: #94a3b8 !important;
  border-bottom: 2px solid #1e293b !important;
}

.dark tbody tr {
  border-bottom: 1px solid #1a2438 !important;
}

.dark tbody tr:hover {
  background-color: #121926 !important;
}

.dark td {
  color: #e2e8f0 !important;
}

/* Form inputs & slider options container */
.dark .bg-amber-50 {
  background-color: rgba(245, 158, 11, 0.08) !important;
  border-color: rgba(245, 158, 11, 0.15) !important;
}

.dark .bg-amber-50\/50 {
  background-color: rgba(245, 158, 11, 0.04) !important;
}

/* Modals layout */
.dark .bg-slate-950\/60 {
  background-color: rgba(2, 6, 23, 0.75) !important;
}

/* Animated practices cards in conductor panel */
.dark .bg-slate-50\/50.border-slate-200:hover {
  background-color: #121c2f !important;
  border-color: #243555 !important;
}

/* Recharts labels adjustment */
.dark .recharts-cartesian-grid-horizontal line,
.dark .recharts-cartesian-grid-vertical line {
  stroke: #1e293b !important;
}

.dark .recharts-text {
  fill: #94a3b8 !important;
}

.dark .recharts-tooltip-cursor {
  fill: #1e293b !important;
}

.dark .recharts-default-tooltip {
  background-color: #0b111e !important;
  border: 1px solid #1e293b !important;
}

/* Custom Scrollbar Styles for Booking Form Dialog */
.custom-scroll-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
}
.custom-scroll-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 10px;
}
.custom-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
.dark .custom-scroll-container {
  scrollbar-color: rgba(245, 158, 11, 0.25) transparent !important;
}
.dark .custom-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.25) !important;
}
.dark .custom-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.45) !important;
}

