import "./index.css";

// Saved management links never initialize the editor or its persisted Last.fm fetches.
if (window.location.pathname.startsWith("/manage/")) {
  void import("./management-main");
} else {
  void import("./editor-main");
}
