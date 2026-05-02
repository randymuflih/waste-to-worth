import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="bg-emerald-700 text-white">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="font-bold text-xl">Waste to Worth</span>
          <div className="flex gap-4">
            <Link href="/impact" className="hover:underline">Impact</Link>
            <Link href="/login" className="bg-white text-emerald-700 px-4 py-1 rounded font-medium hover:bg-gray-100">Login</Link>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6">Turn E-Waste Into Value</h1>
          <p className="text-xl mb-8 text-emerald-100 max-w-2xl mx-auto">
            A smart circular e-waste management platform for Makassar.
            Dispose of your electronic waste properly and earn rewards.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register" className="bg-white text-emerald-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100">Get Started</Link>
            <Link href="/impact" className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10">View Impact</Link>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {[
            { step: "1", title: "Drop or Schedule", desc: "Bring e-waste to a dropbox or schedule a pickup" },
            { step: "2", title: "We Collect", desc: "Items are batched and collected on schedule" },
            { step: "3", title: "Verified & Weighed", desc: "Admin verifies items and weighs your contribution" },
            { step: "4", title: "Earn Rewards", desc: "Points are assigned — redeem for electricity tokens, transport credits, and more" },
          ].map((item) => (
            <div key={item.step}>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">{item.step}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Waste to Worth — Makassar, Indonesia</p>
      </footer>
    </div>
  );
}
