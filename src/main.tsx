import React from "react";
import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import App from "./App";
import { Brand } from "./components/common";
import "./index.css";
function Bootstrap() {
  const [splash, setSplash] = useState(
    !sessionStorage.getItem("medeng-splash"),
  );
  useEffect(() => {
    if (!splash) return;
    const id = setTimeout(() => {
      sessionStorage.setItem("medeng-splash", "1");
      setSplash(false);
    }, 450);
    return () => clearTimeout(id);
  }, [splash]);
  return (
    <>
      <App />
      {splash && (
        <div className="splash" aria-label="Loading MedEng class portal">
          <Brand />
          <h1>KMTC MEDICAL ENGINEERING</h1>
          <p>YEAR 2 · SEMESTER 1</p>
          <span className="splash-loader" />
        </div>
      )}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
);
