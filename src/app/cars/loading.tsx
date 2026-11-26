import "./buy.css";

export default function LoadingCars() {
  return <div className="buy-page"><div className="buy-container buy-loading" role="status" aria-label="Loading cars"><h1>Finding your next car…</h1><div className="buy-loading-hero" /><div className="buy-vehicle-grid">{Array.from({ length: 6 }, (_, index) => <div className="buy-loading-card" key={index}><div /><span /><span /><span /></div>)}</div></div></div>;
}
