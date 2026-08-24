import schemes from "../public/data/schemes.json";
import Hero from "../components/Hero";
import FinderApp from "../components/FinderApp";

export default function HomePage() {
  const central = schemes.filter((s) => s.level === "Central").length;
  const states = new Set(schemes.filter((s) => s.state).map((s) => s.state)).size;

  return (
    <div>
      <Hero stats={{ total: schemes.length, central, states }} />
      <FinderApp />
    </div>
  );
}
