import { Routes, Route, Navigate } from "react-router-dom";
import UploadPage     from "./pages/UploadPage";
import AssessmentPage from "./pages/AssessmentPage";
import ResultsPage    from "./pages/ResultsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/"                              element={<UploadPage />} />
      <Route path="/session/:sessionId"            element={<AssessmentPage />} />
      <Route path="/session/:sessionId/results"    element={<ResultsPage />} />
      <Route path="*"                              element={<Navigate to="/" replace />} />
    </Routes>
  );
}
